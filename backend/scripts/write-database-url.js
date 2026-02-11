/**
 * Write DATABASE_URL from environment to backend/.env (for use with railway run).
 * Uses public URL for local dev (internal URL only works inside Railway).
 * Usage: from repo root, railway run node backend/scripts/write-database-url.js
 */
const path = require('path');
const fs = require('fs');

// Prefer public URL for local/dev; internal (postgres.railway.internal) only works on Railway
const internalUrl = process.env.DATABASE_URL;
const publicUrl = process.env.DATABASE_PUBLIC_URL;

// Build public URL from TCP Proxy vars if available (Railway Postgres service)
const tcpDomain = process.env.RAILWAY_TCP_PROXY_DOMAIN;
const tcpPort = process.env.RAILWAY_TCP_PROXY_PORT;
const pgUser = process.env.PGUSER;
const pgPassword = process.env.PGPASSWORD;
const pgDatabase = process.env.PGDATABASE;
let builtPublicUrl = null;
if (tcpDomain && tcpPort && pgUser && pgPassword !== undefined && pgDatabase) {
  const enc = encodeURIComponent;
  builtPublicUrl = `postgresql://${enc(pgUser)}:${enc(pgPassword)}@${tcpDomain}:${tcpPort}/${pgDatabase}`;
}

const url =
  publicUrl ||
  builtPublicUrl ||
  (internalUrl && !internalUrl.includes('railway.internal') ? internalUrl : null);

if (!url) {
  if (internalUrl && internalUrl.includes('railway.internal')) {
    console.error('DATABASE_URL is the internal host (postgres.railway.internal), which is not reachable from your machine.');
    console.error('Use the public connection URL from Railway:');
    console.error('  1. Open your project at https://railway.app');
    console.error('  2. Click the Postgres service → Settings → Networking → TCP Proxy');
    console.error('  3. Enable TCP Proxy (port 5432); copy the shown host and port');
    console.error('  4. In Variables, copy PGUSER, PGPASSWORD, PGDATABASE and build:');
    console.error('     postgresql://USER:PASSWORD@PROXY_HOST:PROXY_PORT/DATABASE');
    console.error('  5. Put that in backend/.env as DATABASE_URL=...');
  } else {
    console.error('DATABASE_URL (or DATABASE_PUBLIC_URL) not set in environment');
  }
  process.exit(1);
}

const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

if (content.match(/^\s*DATABASE_URL=/m)) {
  content = content.replace(/^\s*DATABASE_URL=.*/m, `DATABASE_URL=${url}`);
} else {
  content = content.trimEnd() + (content ? '\n' : '') + `DATABASE_URL=${url}\n`;
}
fs.writeFileSync(envPath, content);
console.log('Wrote DATABASE_URL to backend/.env');
