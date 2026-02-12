/**
 * Run all SQL migrations from backend/db/migrations/ in order.
 * Usage: node backend/scripts/run-migrations.js
 *    or: cd backend && npm run db:migrate
 */
const path = require('path');
const fs = require('fs');

const backendDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(backendDir, '.env') });

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in backend/.env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const migrationsDir = path.join(backendDir, 'db', 'migrations');

async function run() {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    await pool.end();
    return;
  }

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await pool.query(sql);
      console.log(`[ok] ${file}`);
    } catch (err) {
      if (err.code === '42P07') {
        console.log(`[skip] ${file} (tables already exist)`);
      } else {
        console.error(`[fail] ${file}:`, err.message);
        process.exit(1);
      }
    }
  }

  console.log('All migrations applied.');
  await pool.end();
}

run();
