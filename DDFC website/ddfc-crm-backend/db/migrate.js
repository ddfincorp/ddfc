// Runs schema.sql, then seeds an initial Super Admin (and optional demo data)
// if the users table is empty. Safe to re-run.
//
// Usage: node db/migrate.js
//
// Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME env vars to
// control the first login, or accept the printed defaults below.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Applying schema.sql ...');
  await pool.query(schema);

  const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
  if (rows[0].n === 0) {
    const name = process.env.SEED_ADMIN_NAME || 'Super Admin';
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@ddfc.in';
    const password = process.env.SEED_ADMIN_PASSWORD || crypto_random();
    const hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, 'Super Admin', 'Active')`,
      [name, email, hash]
    );

    console.log('\nNo users found — created the first Super Admin account:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log('\nLog in with these, then change the password from Team & Roles.\n');
  } else {
    console.log('Users already exist — skipping admin seed.');
  }

  await pool.end();
}

function crypto_random() {
  return require('crypto').randomBytes(9).toString('base64url');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
