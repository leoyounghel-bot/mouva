import { Pool } from 'pg';

// Check if database is configured
const isDatabaseConfigured = !!process.env.DATABASE_URL;

// PostgreSQL connection pool (only if configured)
const pool = isDatabaseConfigured ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}) : null;

// Test connection on startup (only if pool exists)
if (pool) {
  pool.on('connect', () => {
    console.log('[Database] Connected to PostgreSQL');
  });

  pool.on('error', (err) => {
    console.error('[Database] Unexpected error on idle client', err);
    // Don't exit process, just log the error
  });
} else {
  console.warn('[Database] DATABASE_URL not configured - running without database');
}

export default pool;

// Helper function for queries
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  if (!pool) {
    throw new Error('Database not configured');
  }
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// Helper function for single row queries
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  if (!pool) {
    throw new Error('Database not configured');
  }
  const result = await pool.query(text, params);
  return result.rows[0] as T || null;
}

export { isDatabaseConfigured };
