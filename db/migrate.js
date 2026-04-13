#!/usr/bin/env node
/**
 * db/migrate.js
 *
 * One-shot migration script: Firestore → Railway Postgres
 *
 * Usage:
 *   node db/migrate.js
 *
 * Required environment variables:
 *   DATABASE_URL          — Railway Postgres connection string
 *   GOOGLE_APPLICATION_CREDENTIALS — path to a Firebase service-account JSON
 *                           (or set FIREBASE_PROJECT_ID + ADC)
 *   FIREBASE_PROJECT_ID   — Firebase project ID (used when ADC is active)
 *   FIRESTORE_DATABASE_ID — (optional) named Firestore database id;
 *                           defaults to "(default)"
 *
 * The script is idempotent: it uses INSERT … ON CONFLICT DO NOTHING so it
 * can be re-run safely if it fails partway through.
 */

'use strict';

const admin = require('firebase-admin');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || '(default)';

const COLLECTIONS = [
  'users',
  'products',
  'projects',
  'reviews',
  'orders',
  'service_providers',
  'solar_kits',
  'public_profiles',
];

// ---------------------------------------------------------------------------
// Initialise Firebase Admin
// ---------------------------------------------------------------------------

function initFirebase() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId =
    process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0122288239';

  if (credPath && fs.existsSync(credPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
  } else {
    // Fall back to Application Default Credentials (e.g. gcloud auth)
    admin.initializeApp({ projectId });
  }

  const db = admin.firestore();
  if (FIRESTORE_DATABASE_ID !== '(default)') {
    // Named database support (Firebase Admin ≥ 12)
    return admin.firestore({ databaseId: FIRESTORE_DATABASE_ID });
  }
  return db;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Firestore Timestamp (or any object with a toDate() method) to a
 * plain ISO-8601 string that Postgres can parse.  Returns null for missing /
 * falsy values.
 */
function toTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

/**
 * Fetch every document in a Firestore collection and return an array of plain
 * objects with an `_id` field set to the document ID.
 */
async function fetchCollection(firestoreDb, collectionName) {
  console.log(`  Fetching Firestore collection: ${collectionName} …`);
  const snapshot = await firestoreDb.collection(collectionName).get();
  const docs = snapshot.docs.map((d) => ({ _id: d.id, ...d.data() }));
  console.log(`    → ${docs.length} documents`);
  return docs;
}

// ---------------------------------------------------------------------------
// Per-collection insert functions
// ---------------------------------------------------------------------------

async function insertUsers(pool, docs) {
  let inserted = 0;
  for (const d of docs) {
    await pool.query(
      `INSERT INTO users (
         uid, "displayName", email, role, expertise, academics, bio,
         "photoURL", "hasSeenWelcome", "onboardingCompleted", "expertJoinedAt",
         "isApproved", "showContacts", "phoneNumber", "subSpecialty",
         "yearsOfExperience", "keyProjects", availability, phone,
         "contactEmail", "lastLogin", "updatedAt", "createdAt"
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
         $20,$21,$22,$23
       )
       ON CONFLICT (uid) DO NOTHING`,
      [
        d._id,                                          // uid = Firestore doc ID
        d.displayName || 'Unknown',
        d.email || '',
        ['user', 'expert', 'admin'].includes(d.role) ? d.role : 'user',
        d.expertise || null,
        d.academics || null,
        d.bio || null,
        d.photoURL || null,
        d.hasSeenWelcome ?? false,
        d.onboardingCompleted ?? false,
        toTimestamp(d.expertJoinedAt),
        d.isApproved ?? false,
        d.showContacts ?? true,
        d.phoneNumber || null,
        d.subSpecialty || null,
        d.yearsOfExperience != null ? String(d.yearsOfExperience) : null,
        d.keyProjects || null,
        d.availability ? JSON.stringify(d.availability) : null,
        d.phone || null,
        d.contactEmail || null,
        toTimestamp(d.lastLogin),
        toTimestamp(d.updatedAt) || new Date().toISOString(),
        toTimestamp(d.createdAt) || new Date().toISOString(),
      ]
    );
    inserted++;
  }
  console.log(`    ✓ users: ${inserted} rows upserted`);
}

async function insertProducts(pool, docs) {
  let inserted = 0;
  const validCategories = ['Solar', 'Water Treatment', 'Sanitation'];
  for (const d of docs) {
    const category = validCategories.includes(d.category)
      ? d.category
      : 'Solar';
    await pool.query(
      `INSERT INTO products (
         name, description, price, category, "subCategory", "imageUrl", "createdAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT DO NOTHING`,
      [
        d.name || 'Unnamed Product',
        d.description || '',
        parseFloat(d.price) || 0,
        category,
        d.subCategory || null,
        d.imageUrl || null,
        toTimestamp(d.createdAt) || new Date().toISOString(),
      ]
    );
    inserted++;
  }
  console.log(`    ✓ products: ${inserted} rows upserted`);
}

async function insertProjects(pool, docs, userUids) {
  let inserted = 0;
  let skipped = 0;
  const validCategories = ['Solar', 'Water Treatment', 'Sanitation'];
  const validStatuses = ['pending', 'active', 'completed', 'rejected'];

  for (const d of docs) {
    // ownerUid must reference an existing user
    if (!userUids.has(d.ownerUid)) {
      console.warn(
        `    ⚠ Skipping project "${d.title}" — ownerUid "${d.ownerUid}" not found in users`
      );
      skipped++;
      continue;
    }
    const category = validCategories.includes(d.category)
      ? d.category
      : 'Solar';
    const status = validStatuses.includes(d.status) ? d.status : 'pending';

    await pool.query(
      `INSERT INTO projects (
         title, description, "ownerUid", "ownerName", "targetFunding",
         "currentFunding", category, "imageUrl", milestones, "isApproved",
         status, "createdAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT DO NOTHING`,
      [
        d.title || 'Untitled Project',
        d.description || '',
        d.ownerUid,
        d.ownerName || 'Unknown',
        parseFloat(d.targetFunding) || 0,
        parseFloat(d.currentFunding) || 0,
        category,
        d.imageUrl || null,
        d.milestones ? JSON.stringify(d.milestones) : null,
        d.isApproved ?? false,
        status,
        toTimestamp(d.createdAt) || new Date().toISOString(),
      ]
    );
    inserted++;
  }
  console.log(
    `    ✓ projects: ${inserted} rows upserted, ${skipped} skipped (missing owner)`
  );
}

async function insertReviews(pool, docs, productIdMap, userUids) {
  let inserted = 0;
  let skipped = 0;

  for (const d of docs) {
    // productId in Firestore is the Firestore doc ID; map to Postgres UUID
    const pgProductId = productIdMap.get(d.productId);
    if (!pgProductId) {
      console.warn(
        `    ⚠ Skipping review — productId "${d.productId}" not found in products`
      );
      skipped++;
      continue;
    }
    if (!userUids.has(d.userId)) {
      console.warn(
        `    ⚠ Skipping review — userId "${d.userId}" not found in users`
      );
      skipped++;
      continue;
    }

    const rating = parseInt(d.rating, 10);
    await pool.query(
      `INSERT INTO reviews (
         "productId", "userId", "userName", rating, comment, "createdAt"
       ) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING`,
      [
        pgProductId,
        d.userId,
        d.userName || 'Anonymous',
        rating >= 1 && rating <= 5 ? rating : 5,
        d.comment || '',
        toTimestamp(d.createdAt) || new Date().toISOString(),
      ]
    );
    inserted++;
  }
  console.log(
    `    ✓ reviews: ${inserted} rows upserted, ${skipped} skipped`
  );
}

async function insertOrders(pool, docs, userUids) {
  let inserted = 0;
  let skipped = 0;
  const validStatuses = ['pending', 'paid', 'failed', 'shipped', 'delivered'];
  const validMethods = ['card', 'mpesa'];

  for (const d of docs) {
    if (!userUids.has(d.userId)) {
      console.warn(
        `    ⚠ Skipping order — userId "${d.userId}" not found in users`
      );
      skipped++;
      continue;
    }
    const status = validStatuses.includes(d.status) ? d.status : 'pending';
    const method = validMethods.includes(d.paymentMethod)
      ? d.paymentMethod
      : 'card';

    await pool.query(
      `INSERT INTO orders (
         "userId", "userEmail", items, "totalAmount", status,
         "paymentMethod", "shippingInfo", "createdAt", "paidAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [
        d.userId,
        d.userEmail || '',
        JSON.stringify(d.items || []),
        parseFloat(d.totalAmount) || 0,
        status,
        method,
        JSON.stringify(d.shippingInfo || {}),
        toTimestamp(d.createdAt) || new Date().toISOString(),
        toTimestamp(d.paidAt),
      ]
    );
    inserted++;
  }
  console.log(
    `    ✓ orders: ${inserted} rows upserted, ${skipped} skipped`
  );
}

async function insertServiceProviders(pool, docs) {
  let inserted = 0;
  for (const d of docs) {
    await pool.query(
      `INSERT INTO service_providers (
         name, category, "subCategory", description, "imageUrl",
         "contactEmail", "contactPhone", location, "isApproved", "createdAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT DO NOTHING`,
      [
        d.name || 'Unknown Provider',
        d.category || 'General',
        d.subCategory || null,
        d.description || '',
        d.imageUrl || '',
        d.contactEmail || '',
        d.contactPhone || '',
        d.location || '',
        d.isApproved ?? false,
        toTimestamp(d.createdAt) || new Date().toISOString(),
      ]
    );
    inserted++;
  }
  console.log(`    ✓ service_providers: ${inserted} rows upserted`);
}

async function insertSolarKits(pool, docs, userUids) {
  let inserted = 0;
  let skipped = 0;

  for (const d of docs) {
    if (!userUids.has(d.userId)) {
      console.warn(
        `    ⚠ Skipping solar_kit — userId "${d.userId}" not found in users`
      );
      skipped++;
      continue;
    }
    await pool.query(
      `INSERT INTO solar_kits (
         "userId", "kitName", "loadRequirements", "totalDailyLoadWh",
         "totalPeakLoadW", recommendations, "createdAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT DO NOTHING`,
      [
        d.userId,
        d.kitName || 'My Solar Kit',
        JSON.stringify(d.loadRequirements || []),
        parseFloat(d.totalDailyLoadWh) || 0,
        parseFloat(d.totalPeakLoadW) || 0,
        d.recommendations ? JSON.stringify(d.recommendations) : null,
        toTimestamp(d.createdAt) || new Date().toISOString(),
      ]
    );
    inserted++;
  }
  console.log(
    `    ✓ solar_kits: ${inserted} rows upserted, ${skipped} skipped`
  );
}

async function insertPublicProfiles(pool, docs, userUids) {
  let inserted = 0;
  let skipped = 0;

  for (const d of docs) {
    const uid = d.uid || d._id;
    if (!userUids.has(uid)) {
      console.warn(
        `    ⚠ Skipping public_profile — uid "${uid}" not found in users`
      );
      skipped++;
      continue;
    }
    await pool.query(
      `INSERT INTO public_profiles (
         uid, "displayName", role, expertise, academics, bio, "photoURL",
         "expertJoinedAt", "isApproved", "showContacts", "phoneNumber",
         "updatedAt", "subSpecialty", "yearsOfExperience", "keyProjects",
         availability, phone, "contactEmail"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (uid) DO NOTHING`,
      [
        uid,
        d.displayName || 'Unknown',
        'expert',                                       // public_profiles are always experts
        d.expertise || '',
        d.academics || '',
        d.bio || '',
        d.photoURL || null,
        d.expertJoinedAt || new Date().toISOString(),
        d.isApproved ?? false,
        d.showContacts ?? true,
        d.phoneNumber || null,
        toTimestamp(d.updatedAt) || new Date().toISOString(),
        d.subSpecialty || null,
        d.yearsOfExperience != null ? String(d.yearsOfExperience) : null,
        d.keyProjects || null,
        d.availability ? JSON.stringify(d.availability) : null,
        d.phone || null,
        d.contactEmail || null,
      ]
    );
    inserted++;
  }
  console.log(
    `    ✓ public_profiles: ${inserted} rows upserted, ${skipped} skipped`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== WashPivot Hub: Firestore → Postgres Migration ===\n');

  // Validate environment
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  // 1. Connect to Postgres
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Connecting to Postgres …');
  await pool.query('SELECT 1'); // smoke test
  console.log('  ✓ Connected\n');

  // 2. Initialise Firestore
  console.log('Initialising Firebase Admin …');
  const firestoreDb = initFirebase();
  console.log('  ✓ Firestore ready\n');

  // 3. Fetch all collections from Firestore
  console.log('Fetching data from Firestore …');
  const [
    userDocs,
    productDocs,
    projectDocs,
    reviewDocs,
    orderDocs,
    serviceProviderDocs,
    solarKitDocs,
    publicProfileDocs,
  ] = await Promise.all(
    COLLECTIONS.map((c) => fetchCollection(firestoreDb, c))
  );
  console.log('  ✓ All collections fetched\n');

  // 4. Insert into Postgres (order matters — respect FK constraints)
  console.log('Inserting data into Postgres …\n');

  // 4a. Users first (everything else references users.uid)
  await insertUsers(pool, userDocs);

  // Build a Set of known UIDs for FK validation
  const { rows: uidRows } = await pool.query('SELECT uid FROM users');
  const userUids = new Set(uidRows.map((r) => r.uid));

  // 4b. Products (reviews reference products)
  await insertProducts(pool, productDocs);

  // Build a map: Firestore product doc ID → Postgres UUID
  // We match on (name, createdAt) since we don't store the Firestore ID in Postgres.
  // For a more robust mapping, consider adding a `firestore_id` column.
  const { rows: pgProducts } = await pool.query(
    'SELECT id, name, "createdAt" FROM products'
  );
  const productIdMap = new Map();
  for (const doc of productDocs) {
    const match = pgProducts.find(
      (p) =>
        p.name === (doc.name || 'Unnamed Product')
    );
    if (match) productIdMap.set(doc._id, match.id);
  }

  // 4c. Remaining collections
  await insertProjects(pool, projectDocs, userUids);
  await insertReviews(pool, reviewDocs, productIdMap, userUids);
  await insertOrders(pool, orderDocs, userUids);
  await insertServiceProviders(pool, serviceProviderDocs);
  await insertSolarKits(pool, solarKitDocs, userUids);
  await insertPublicProfiles(pool, publicProfileDocs, userUids);

  console.log('\n=== Migration complete ===');
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('\nMigration failed:', err);
  process.exit(1);
});
