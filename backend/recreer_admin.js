const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: 'postgresql://chefunitplus_user:8Fmyat0yjscDkIS7Jfpmkdjeg4onENOn@dpg-dasejhh7lnhs738rp620-a.frankfurt-postgres.render.com/chefunitplus',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('=== 1) Suppression ancien admin (id=null) ===');
    const del = await pool.query('DELETE FROM users WHERE email = $1', ['admin@chefunitplus.com']);
    console.log('  Supprime :', del.rowCount, 'ligne(s)');
    console.log('');

    const newId = crypto.randomUUID();
    console.log('=== 2) Nouvel UUID ===');
    console.log('  ' + newId);
    console.log('');

    console.log('=== 3) Creation nouvel admin ===');
    const hashed = await bcrypt.hash('admin123', 10);
    const res = await pool.query(
      `INSERT INTO users (id, email, password_hash, role, is_active, full_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, is_active`,
      [newId, 'admin@chefunitplus.com', hashed, 'admin', 1, 'Administrateur Principal']
    );
    console.log('  OK Admin cree :');
    console.log('  ' + JSON.stringify(res.rows[0]));
    console.log('');

    console.log('=== 4) Verification ===');
    const check = await pool.query(
      'SELECT id, email, role, is_active FROM users WHERE email = $1',
      ['admin@chefunitplus.com']
    );
    console.log('  ' + JSON.stringify(check.rows[0]));

  } catch (err) {
    console.error('ERREUR :', err.message);
  }
  await pool.end();
}

run();
