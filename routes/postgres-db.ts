/**
 * routes/postgres-db.ts
 *
 * PostgreSQL connection pool and query helpers for WashPivot Hub.
 *
 * Usage:
 *   import { query, getClient, initDb } from './postgres-db.ts';
 *
 *   // Simple query
 *   const { rows } = await query('SELECT * FROM products WHERE id = $1', [id]);
 *
 *   // Transaction
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     await client.query('INSERT INTO ...', [...]);
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import path from 'path';

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Pool singleton
// ---------------------------------------------------------------------------

let pool: pg.Pool | null = null;

function createPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Add a PostgreSQL service to your Railway project and link it, ' +
      'or set DATABASE_URL manually in the Variables panel.'
    );
  }

  const newPool = new Pool({
    connectionString,
    // Railway PostgreSQL uses SSL in production
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
    max: 10,                // maximum pool size
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  newPool.on('error', (err) => {
    console.error('[postgres-db] Unexpected pool error:', err.message);
  });

  newPool.on('connect', () => {
    console.log('[postgres-db] New client connected to PostgreSQL');
  });

  return newPool;
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Execute a parameterised query and return the full QueryResult.
 * Automatically acquires and releases a client from the pool.
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await getPool().query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[postgres-db] query (${duration}ms):`, text.slice(0, 120));
    }
    return result;
  } catch (err: any) {
    console.error('[postgres-db] Query error:', err.message, '\nSQL:', text);
    throw err;
  }
}

/**
 * Acquire a dedicated client for transactions.
 * Caller MUST call client.release() in a finally block.
 */
export async function getClient(): Promise<pg.PoolClient> {
  return getPool().connect();
}

// ---------------------------------------------------------------------------
// Schema initialisation
// ---------------------------------------------------------------------------

/**
 * Read db/schema.sql and execute it against the database.
 * Safe to call on every startup – all statements use IF NOT EXISTS.
 */
export async function initDb(): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  let sql: string;
  try {
    sql = readFileSync(schemaPath, 'utf-8');
  } catch (err: any) {
    console.error('[postgres-db] Could not read db/schema.sql:', err.message);
    throw err;
  }

  try {
    await query(sql);
    console.log('[postgres-db] Schema initialised successfully.');
  } catch (err: any) {
    console.error('[postgres-db] Schema initialisation failed:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(): Promise<void> {
  if (pool) {
    console.log('[postgres-db] Closing connection pool…');
    await pool.end();
    pool = null;
    console.log('[postgres-db] Connection pool closed.');
  }
}

process.on('SIGINT',  () => shutdown().then(() => process.exit(0)));
process.on('SIGTERM', () => shutdown().then(() => process.exit(0)));
