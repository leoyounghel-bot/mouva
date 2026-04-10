/**
 * Seed script to create a test user for development
 * Run: npx ts-node seed-test-user.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import pool from './config/database';

const SALT_ROUNDS = 10;

async function seedTestUser() {
  if (!pool) {
    console.error('✗ Database not configured. Set DATABASE_URL environment variable.');
    process.exit(1);
  }

  const testEmail = 'test@example.com';
  const testPassword = 'test123';

  try {
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [testEmail]
    );

    if (existing.rows.length > 0) {
      console.log(`✓ Test user already exists: ${testEmail}`);
      console.log(`  Password: ${testPassword}`);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(testPassword, SALT_ROUNDS);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [testEmail, passwordHash]
    );

    console.log('✓ Test user created successfully!');
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: ${testPassword}`);
    console.log(`  User ID: ${result.rows[0].id}`);
  } catch (error) {
    console.error('✗ Failed to create test user:', error);
  } finally {
    await pool.end();
  }
}

seedTestUser();
