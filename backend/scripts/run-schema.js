/**
 * Run backend/db/schema.sql against DATABASE_URL from backend/.env
 * Usage: from repo root: node backend/scripts/run-schema.js
 *    or from backend: node scripts/run-schema.js
 */
const path = require('path');
const fs = require('fs');

// Load .env from backend directory
const backendDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(backendDir, '.env') });

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in backend/.env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const schemaPath = path.join(backendDir, 'db', 'schema.sql');
const sql = fs.readFileSync(schemaPath, 'utf8');

async function run() {
  try {
    await pool.query(sql);
    console.log('✅ Schema applied successfully.');
  } catch (err) {
    if (err.code === '42P07') {
      console.log('⚠️ Tables already exist (42P07). Schema may have been applied before.');
    } else {
      console.error('❌ Schema failed:', err.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

run();
