#!/usr/bin/env node
// Simple migration helper for reactions table. Requires 'pg' to be installed.
const connectionString = process.env.DATABASE_URL || process.argv[2];
if (!connectionString) {
  console.error('Usage: DATABASE_URL=... node migrate-reactions.js  OR pass DATABASE_URL as the first argument');
  process.exit(1);
}
let Pool;
try {
  Pool = require('pg').Pool;
} catch (err) {
  console.error("Module 'pg' not found. Install dependencies in the backend: cd backend && npm install");
  process.exit(1);
}

(async () => {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    const sql = require('fs').readFileSync(require('path').join(__dirname, '..', 'sql', 'create_reactions_table.sql'), 'utf8');
    await client.query(sql);
    console.log('Reactions migration applied');
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
