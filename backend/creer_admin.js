const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://chefunitplus_user:8Fmyat0yjscDkIS7Jfpmkdjeg4onENOn@dpg-dasejhh7lnhs738rp620-a.frankfurt-postgres.render.com/chefunitplus',
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  const email = 'admin@chefunitplus.com';
  const password = 'admin123';
  const hashed = await bcrypt.hash(password, 10);

  try {
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    const res = await pool.query(
      `INSERT INTO users (email, password, role, is_active, full_name, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, email, role`,
      [email, hashed, 'admin', true, 'Administrateur Principal']
    );
    console.log('OK Admin cree :', res.rows[0]);
  } catch (err) {
    console.error('ERREUR :', err.message);
  }
  await pool.end();
}

createAdmin();
