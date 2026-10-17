const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://chefunitplus_user:8Fmyat0yjscDkIS7Jfpmkdjeg4onENOn@dpg-dasejhh7lnhs738rp620-a.frankfurt-postgres.render.com/chefunitplus',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('=== 1) TOUS les utilisateurs ===');
    const users = await pool.query('SELECT id, email, role, is_active FROM users ORDER BY email');
    if (users.rows.length === 0) {
      console.log('  AUCUN UTILISATEUR');
    } else {
      users.rows.forEach(u => {
        console.log(`  [${u.id}] ${u.email} | role=${u.role} | is_active=${u.is_active} (${typeof u.is_active})`);
      });
    }
    console.log('');

    console.log('=== 2) Recherche admin@chefunitplus.com ===');
    const admin = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@chefunitplus.com']);
    if (admin.rows.length === 0) {
      console.log('  AUCUN ADMIN TROUVE');
      console.log('');

      console.log('=== 3) Creation de l admin ===');
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash('admin123', 10);
      const res = await pool.query(
        `INSERT INTO users (email, password_hash, role, is_active, full_name)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, is_active`,
        ['admin@chefunitplus.com', hashed, 'admin', 1, 'Administrateur Principal']
      );
      console.log('  OK Admin cree :', JSON.stringify(res.rows[0]));
    } else {
      console.log('  Admin trouve :', JSON.stringify(admin.rows[0]));
      console.log('');

      console.log('=== 3) Correction is_active ===');
      await pool.query('UPDATE users SET is_active = 1 WHERE email = $1', ['admin@chefunitplus.com']);
      console.log('  is_active mis a 1');

      const after = await pool.query(
        'SELECT id, email, role, is_active FROM users WHERE email = $1',
        ['admin@chefunitplus.com']
      );
      console.log('  Apres :', JSON.stringify(after.rows[0]));
    }
  } catch (err) {
    console.error('ERREUR :', err.message);
  }
  await pool.end();
}

run();
