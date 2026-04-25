/**
 * scripts/migrate-firebase-to-postgres.ts
 *
 * One-shot migration: exports data from Firebase Firestore and imports it
 * into PostgreSQL.  Run this script once during the cutover window.
 *
 * Prerequisites
 * -------------
 *   1. Set DATABASE_URL to your PostgreSQL connection string.
 *   2. Set FIREBASE_SERVICE_ACCOUNT to your Firebase service-account JSON
 *      (or ensure GOOGLE_APPLICATION_CREDENTIALS points to the file).
 *   3. Set FIREBASE_PROJECT_ID if it is not embedded in the service account.
 *
 * Usage
 * -----
 *   npx tsx scripts/migrate-firebase-to-postgres.ts
 *
 * The script is idempotent: it uses INSERT … ON CONFLICT DO NOTHING so it
 * is safe to re-run if it was interrupted partway through.
 */

import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string) {
  console.log(`[migrate] ${new Date().toISOString()}  ${msg}`);
}

function warn(msg: string) {
  console.warn(`[migrate] WARN  ${msg}`);
}

// ---------------------------------------------------------------------------
// Firebase initialisation
// ---------------------------------------------------------------------------

function initFirebase(): admin.firestore.Firestore {
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const svcAccount  = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (admin.apps.length === 0) {
    const options: admin.AppOptions = { projectId };
    if (svcAccount) {
      try {
        options.credential = admin.credential.cert(JSON.parse(svcAccount));
      } catch {
        warn('Could not parse FIREBASE_SERVICE_ACCOUNT – falling back to ADC.');
      }
    }
    admin.initializeApp(options);
  }

  return admin.firestore();
}

// ---------------------------------------------------------------------------
// PostgreSQL pool
// ---------------------------------------------------------------------------

function createPgPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }
  return new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

// ---------------------------------------------------------------------------
// Schema bootstrap (same DDL as db/schema.sql)
// ---------------------------------------------------------------------------

async function ensureSchema(pool: pg.Pool): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf-8');
  await pool.query(sql);
  log('Schema verified / created.');
}

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

async function fetchCollection(
  db: admin.firestore.Firestore,
  collectionPath: string
): Promise<Array<{ id: string; [key: string]: any }>> {
  const snapshot = await db.collection(collectionPath).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/** Convert a Firestore Timestamp (or ISO string) to a JS Date. */
function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string') return new Date(value);
  if (value instanceof Date) return value;
  return null;
}

// ---------------------------------------------------------------------------
// Migration functions per entity
// ---------------------------------------------------------------------------

async function migrateCompanies(
  db: admin.firestore.Firestore,
  pool: pg.Pool
): Promise<number> {
  log('Migrating companies…');
  const docs = await fetchCollection(db, 'companies');
  let count = 0;

  for (const doc of docs) {
    await pool.query(
      `INSERT INTO companies (id, name, subscription_tier, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [
        doc.id,
        doc.name        || 'Unknown',
        doc.subscriptionTier || 'free',
        toDate(doc.createdAt) || new Date(),
      ]
    );
    count++;
  }

  log(`  → ${count} companies migrated.`);
  return count;
}

async function migrateUsers(
  db: admin.firestore.Firestore,
  pool: pg.Pool
): Promise<number> {
  log('Migrating users…');
  const docs = await fetchCollection(db, 'users');
  let count = 0;

  for (const doc of docs) {
    await pool.query(
      `INSERT INTO users (id, email, name, role, company_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        doc.id,
        doc.email      || '',
        doc.name       || doc.displayName || '',
        doc.role       || 'user',
        doc.companyId  || null,
        toDate(doc.createdAt) || new Date(),
      ]
    );
    count++;
  }

  log(`  → ${count} users migrated.`);
  return count;
}

async function migrateProducts(
  db: admin.firestore.Firestore,
  pool: pg.Pool
): Promise<number> {
  log('Migrating products…');
  const docs = await fetchCollection(db, 'customer_products');
  let count = 0;

  for (const doc of docs) {
    const createdAt = toDate(doc.createdAt) || new Date();
    const updatedAt = toDate(doc.updatedAt) || createdAt;

    await pool.query(
      `INSERT INTO products (id, name, description, category, price, company_id, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        doc.id,
        doc.name        || 'Unnamed Product',
        doc.description || '',
        doc.category    || 'General',
        parseFloat(doc.price) || 0,
        doc.companyId   || null,
        doc.createdBy   || null,
        createdAt,
        updatedAt,
      ]
    );

    // Migrate photos sub-collection
    await migrateProductPhotos(db, pool, doc.id);
    count++;
  }

  log(`  → ${count} products migrated.`);
  return count;
}

async function migrateProductPhotos(
  db: admin.firestore.Firestore,
  pool: pg.Pool,
  productId: string
): Promise<void> {
  const snapshot = await db
    .collection('customer_products')
    .doc(productId)
    .collection('photos')
    .get();

  for (const photoDoc of snapshot.docs) {
    const photo = photoDoc.data();
    await pool.query(
      `INSERT INTO product_photos (id, product_id, data, mime_type, uploaded_by, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        photoDoc.id,
        productId,
        photo.data       || '',
        photo.mimeType   || 'image/jpeg',
        photo.uploadedBy || null,
        toDate(photo.uploadedAt) || new Date(),
      ]
    );
  }
}

async function migrateInventory(
  db: admin.firestore.Firestore,
  pool: pg.Pool
): Promise<number> {
  log('Migrating inventory…');
  const docs = await fetchCollection(db, 'inventory');
  let count = 0;

  for (const doc of docs) {
    await pool.query(
      `INSERT INTO inventory
         (id, company_id, name, qty, category, min_threshold, unit_cost, unit, opening_stock, requisitioned, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [
        doc.id,
        doc.companyId      || null,
        doc.name           || 'Unknown',
        parseFloat(doc.qty)          || 0,
        doc.category       || 'General',
        parseFloat(doc.minThreshold) || 0,
        parseFloat(doc.unitCost)     || 0,
        doc.unit           || 'pcs',
        parseFloat(doc.openingStock) || 0,
        parseFloat(doc.requisitioned)|| 0,
        toDate(doc.createdAt) || new Date(),
        toDate(doc.updatedAt) || new Date(),
      ]
    );
    count++;
  }

  log(`  → ${count} inventory items migrated.`);
  return count;
}

async function migrateRequisitions(
  db: admin.firestore.Firestore,
  pool: pg.Pool
): Promise<number> {
  log('Migrating requisitions…');
  const docs = await fetchCollection(db, 'requisitions');
  let count = 0;

  for (const doc of docs) {
    await pool.query(
      `INSERT INTO requisitions
         (id, company_id, user_id, date, status, items, reason, requester, tool, qty, type, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [
        doc.id,
        doc.companyId  || null,
        doc.userId     || null,
        toDate(doc.date) || new Date(),
        doc.status     || 'pending',
        JSON.stringify(doc.items || []),
        doc.reason     || '',
        doc.requester  || '',
        doc.tool       || '',
        parseFloat(doc.qty) || 0,
        doc.type       || 'internal',
        toDate(doc.createdAt) || new Date(),
        toDate(doc.updatedAt) || new Date(),
      ]
    );
    count++;
  }

  log(`  → ${count} requisitions migrated.`);
  return count;
}

async function migrateWaybills(
  db: admin.firestore.Firestore,
  pool: pg.Pool
): Promise<number> {
  log('Migrating waybills…');
  const docs = await fetchCollection(db, 'waybills');
  let count = 0;

  for (const doc of docs) {
    await pool.query(
      `INSERT INTO waybills
         (id, company_id, date, status, items, sender, receiver, destination, tracking_number, status_history, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [
        doc.id,
        doc.companyId      || null,
        toDate(doc.date)   || new Date(),
        doc.status         || 'pending',
        JSON.stringify(doc.items         || []),
        doc.sender         || '',
        doc.receiver       || '',
        doc.destination    || '',
        doc.trackingNumber || '',
        JSON.stringify(doc.statusHistory || []),
        toDate(doc.createdAt) || new Date(),
        toDate(doc.updatedAt) || new Date(),
      ]
    );
    count++;
  }

  log(`  → ${count} waybills migrated.`);
  return count;
}

async function migrateAuditLogs(
  db: admin.firestore.Firestore,
  pool: pg.Pool
): Promise<number> {
  log('Migrating audit logs…');
  const docs = await fetchCollection(db, 'audit_logs');
  let count = 0;

  for (const doc of docs) {
    await pool.query(
      `INSERT INTO audit_logs
         (id, user_id, company_id, action, resource_type, resource_id, details, old_values, new_values, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [
        doc.id,
        doc.userId       || null,
        doc.companyId    || null,
        doc.action       || '',
        doc.resourceType || '',
        doc.resourceId   || '',
        doc.details      || '',
        doc.oldValues ? JSON.stringify(doc.oldValues) : null,
        doc.newValues ? JSON.stringify(doc.newValues) : null,
        toDate(doc.timestamp) || new Date(),
      ]
    );
    count++;
  }

  log(`  → ${count} audit log entries migrated.`);
  return count;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

async function verify(pool: pg.Pool): Promise<void> {
  log('Verifying row counts…');
  const tables = [
    'companies', 'users', 'products', 'product_photos',
    'inventory', 'requisitions', 'waybills', 'audit_logs',
  ];

  for (const table of tables) {
    const { rows } = await pool.query(`SELECT COUNT(*) AS n FROM ${table}`);
    log(`  ${table.padEnd(20)} ${rows[0].n} rows`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log('=== Firebase → PostgreSQL migration starting ===');

  const db   = initFirebase();
  const pool = createPgPool();

  try {
    await ensureSchema(pool);

    // Order matters: companies and users must exist before products/inventory
    await migrateCompanies(db, pool);
    await migrateUsers(db, pool);
    await migrateProducts(db, pool);   // also migrates product_photos
    await migrateInventory(db, pool);
    await migrateRequisitions(db, pool);
    await migrateWaybills(db, pool);
    await migrateAuditLogs(db, pool);

    await verify(pool);

    log('=== Migration completed successfully ===');
  } catch (err: any) {
    console.error('[migrate] FATAL:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
    log('PostgreSQL pool closed.');
  }
}

main();
