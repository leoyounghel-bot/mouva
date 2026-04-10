import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM if package.json has "type": "module", but assuming commonjs or tsx handles it.
// If not module, use standard __dirname. 
// Just in case, let's look for .env relative to this script.
const envPath = path.resolve(__dirname, '../../.env.production'); // local path? No, in container it's in root probably or just .env?
// In container: WORKDIR /app. .env is likely at /app/.env (copied? docker-compose env_file?)
// If using env_file in docker-compose, process.env is ALREADY populated. We don't need dotenv.config()!
// But locally we might.

async function run() {
  if (!process.env.DATABASE_URL) {
    if (fs.existsSync(path.resolve(__dirname, '../.env'))) {
        dotenv.config({ path: path.resolve(__dirname, '../.env') });
    }
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // For Azure
  });

  try {
    const sqlPath = path.resolve(__dirname, '../models/schema.sql');
    console.log(`Reading schema from ${sqlPath}`);
    if (!fs.existsSync(sqlPath)) {
        console.error('Schema file not found!');
        process.exit(1);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running schema initialization...');
    await pool.query(sql);
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
