import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const sqlPath = path.resolve(__dirname, '../models/migrate-magic-link.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration: migrate-magic-link.sql');
    await pool.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
