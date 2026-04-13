/**
 * src/db.ts
 *
 * Railway Postgres connection pool and query helpers.
 *
 * Usage (server-side only — never import this in browser/Vite bundles):
 *
 *   import { query, getOne, transaction } from './db';
 *
 *   const users = await query('SELECT * FROM users WHERE role = $1', ['expert']);
 *   const user  = await getOne<User>('SELECT * FROM users WHERE uid = $1', [uid]);
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// ---------------------------------------------------------------------------
// Pool singleton
// ---------------------------------------------------------------------------

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'Add it to your Railway service variables.'
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway Postgres requires SSL in production
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  // Sensible pool defaults
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err);
});

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Run a parameterised query and return all matching rows.
 *
 * @example
 * const products = await query<Product>(
 *   'SELECT * FROM products WHERE category = $1 ORDER BY "createdAt" DESC',
 *   ['Solar']
 * );
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result: QueryResult<T> = await pool.query<T>(sql, params);
  return result.rows;
}

/**
 * Run a parameterised query and return the first row, or `null` if no rows
 * were returned.
 *
 * @example
 * const user = await getOne<User>(
 *   'SELECT * FROM users WHERE uid = $1',
 *   [firebaseUid]
 * );
 */
export async function getOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/**
 * Execute multiple queries inside a single transaction.  If any query throws,
 * the transaction is rolled back automatically.
 *
 * @example
 * await transaction(async (client) => {
 *   await client.query('UPDATE users SET role = $1 WHERE uid = $2', ['expert', uid]);
 *   await client.query('INSERT INTO public_profiles …', […]);
 * });
 */
export async function transaction<T = void>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Typed query helpers for common operations
// ---------------------------------------------------------------------------

// ── Users ──────────────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  role: 'user' | 'expert' | 'admin';
  expertise: string | null;
  academics: string | null;
  bio: string | null;
  photoURL: string | null;
  hasSeenWelcome: boolean;
  onboardingCompleted: boolean;
  expertJoinedAt: Date | null;
  isApproved: boolean;
  showContacts: boolean;
  phoneNumber: string | null;
  subSpecialty: string | null;
  yearsOfExperience: string | null;
  keyProjects: string | null;
  availability: string[] | null;
  phone: string | null;
  contactEmail: string | null;
  lastLogin: Date | null;
  updatedAt: Date;
  createdAt: Date;
}

/** Fetch a user profile by Firebase Auth UID. */
export async function getUserByUid(uid: string): Promise<DbUser | null> {
  return getOne<DbUser>('SELECT * FROM users WHERE uid = $1', [uid]);
}

/** Create or update a user profile (upsert on uid). */
export async function upsertUser(
  uid: string,
  data: Partial<Omit<DbUser, 'id' | 'uid' | 'createdAt' | 'updatedAt'>>
): Promise<DbUser> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (fields.length === 0) {
    const existing = await getUserByUid(uid);
    if (!existing) throw new Error(`User ${uid} not found`);
    return existing;
  }

  const setClauses = fields
    .map((f, i) => `"${f}" = $${i + 2}`)
    .join(', ');
  const values = fields.map((f) => data[f]);

  const [row] = await query<DbUser>(
    `INSERT INTO users (uid, "displayName", email, "createdAt")
       VALUES ($1, $1, $1, NOW())
       ON CONFLICT (uid) DO UPDATE SET ${setClauses}, "updatedAt" = NOW()
       RETURNING *`,
    [uid, ...values]
  );
  return row;
}

// ── Products ───────────────────────────────────────────────────────────────

export interface DbProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Solar' | 'Water Treatment' | 'Sanitation';
  subCategory: string | null;
  imageUrl: string | null;
  createdAt: Date;
}

/** Fetch all products, optionally filtered by category and/or subCategory. */
export async function getProducts(opts?: {
  category?: string;
  subCategory?: string;
}): Promise<DbProduct[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts?.category) {
    params.push(opts.category);
    conditions.push(`category = $${params.length}`);
  }
  if (opts?.subCategory) {
    params.push(opts.subCategory);
    conditions.push(`"subCategory" = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return query<DbProduct>(
    `SELECT * FROM products ${where} ORDER BY "createdAt" DESC`,
    params
  );
}

/** Fetch a single product by its Postgres UUID. */
export async function getProductById(id: string): Promise<DbProduct | null> {
  return getOne<DbProduct>('SELECT * FROM products WHERE id = $1', [id]);
}

// ── Projects ───────────────────────────────────────────────────────────────

export interface DbProject {
  id: string;
  title: string;
  description: string;
  ownerUid: string;
  ownerName: string;
  targetFunding: number;
  currentFunding: number;
  category: 'Solar' | 'Water Treatment' | 'Sanitation';
  imageUrl: string | null;
  milestones: unknown[] | null;
  isApproved: boolean;
  status: 'pending' | 'active' | 'completed' | 'rejected';
  createdAt: Date;
}

/** Fetch projects. Pass `approvedOnly: true` to hide pending/rejected ones. */
export async function getProjects(opts?: {
  approvedOnly?: boolean;
  ownerUid?: string;
}): Promise<DbProject[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts?.approvedOnly) {
    conditions.push('"isApproved" = TRUE');
  }
  if (opts?.ownerUid) {
    params.push(opts.ownerUid);
    conditions.push(`"ownerUid" = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return query<DbProject>(
    `SELECT * FROM projects ${where} ORDER BY "createdAt" DESC`,
    params
  );
}

// ── Reviews ────────────────────────────────────────────────────────────────

export interface DbReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

/** Fetch all reviews for a product, newest first. */
export async function getReviewsByProduct(
  productId: string
): Promise<DbReview[]> {
  return query<DbReview>(
    'SELECT * FROM reviews WHERE "productId" = $1 ORDER BY "createdAt" DESC',
    [productId]
  );
}

// ── Orders ─────────────────────────────────────────────────────────────────

export interface DbOrder {
  id: string;
  userId: string;
  userEmail: string;
  items: unknown[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'failed' | 'shipped' | 'delivered';
  paymentMethod: 'card' | 'mpesa';
  shippingInfo: Record<string, unknown>;
  createdAt: Date;
  paidAt: Date | null;
}

/** Fetch all orders for a user, newest first. */
export async function getOrdersByUser(userId: string): Promise<DbOrder[]> {
  return query<DbOrder>(
    'SELECT * FROM orders WHERE "userId" = $1 ORDER BY "createdAt" DESC',
    [userId]
  );
}

// ── Service Providers ──────────────────────────────────────────────────────

export interface DbServiceProvider {
  id: string;
  name: string;
  category: string;
  subCategory: string | null;
  description: string;
  imageUrl: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
  isApproved: boolean;
  createdAt: Date;
}

/** Fetch approved service providers, optionally filtered by category. */
export async function getServiceProviders(opts?: {
  approvedOnly?: boolean;
  category?: string;
  subCategory?: string;
}): Promise<DbServiceProvider[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts?.approvedOnly) {
    conditions.push('"isApproved" = TRUE');
  }
  if (opts?.category) {
    params.push(opts.category);
    conditions.push(`category = $${params.length}`);
  }
  if (opts?.subCategory) {
    params.push(opts.subCategory);
    conditions.push(`"subCategory" = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return query<DbServiceProvider>(
    `SELECT * FROM service_providers ${where} ORDER BY "createdAt" DESC`,
    params
  );
}

// ── Solar Kits ─────────────────────────────────────────────────────────────

export interface DbSolarKit {
  id: string;
  userId: string;
  kitName: string;
  loadRequirements: unknown[];
  totalDailyLoadWh: number;
  totalPeakLoadW: number;
  recommendations: unknown | null;
  createdAt: Date;
}

/** Fetch all saved solar kits for a user. */
export async function getSolarKitsByUser(
  userId: string
): Promise<DbSolarKit[]> {
  return query<DbSolarKit>(
    'SELECT * FROM solar_kits WHERE "userId" = $1 ORDER BY "createdAt" DESC',
    [userId]
  );
}

// ── Public Profiles ────────────────────────────────────────────────────────

export interface DbPublicProfile {
  id: string;
  uid: string;
  displayName: string;
  role: 'expert';
  expertise: string;
  academics: string;
  bio: string;
  photoURL: string | null;
  expertJoinedAt: string;
  isApproved: boolean;
  showContacts: boolean;
  phoneNumber: string | null;
  updatedAt: Date;
  subSpecialty: string | null;
  yearsOfExperience: string | null;
  keyProjects: string | null;
  availability: string[] | null;
  phone: string | null;
  contactEmail: string | null;
}

/** Fetch all approved expert public profiles. */
export async function getApprovedExperts(): Promise<DbPublicProfile[]> {
  return query<DbPublicProfile>(
    `SELECT * FROM public_profiles
     WHERE role = 'expert' AND "isApproved" = TRUE
     ORDER BY "updatedAt" DESC`
  );
}

/** Fetch a single public profile by Firebase UID. */
export async function getPublicProfileByUid(
  uid: string
): Promise<DbPublicProfile | null> {
  return getOne<DbPublicProfile>(
    'SELECT * FROM public_profiles WHERE uid = $1',
    [uid]
  );
}
