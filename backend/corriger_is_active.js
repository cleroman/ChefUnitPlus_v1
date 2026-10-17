const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://chefunitplus_user:8Fmyat0yjscDkIS7Jfpmkdjeg4onENOn@dpg-dasejhh7lnhs738rp620-a.frankfurt-postgres.render.com/chefunitplus',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const type = await pool.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name='users' AND column_name='is_active'
    `);
    console.log('Type actuel :', type.rows[0]?.data_type);

    if (type.rows[0]?.data_type !== 'integer') {
      console.log('Conversion en INTEGER...');
      await pool.query(`
        ALTER TABLE users
        ALTER COLUMN is_active TYPE INTEGER
        USING CASE
          WHEN is_active::text IN ('true','1','t','yes') THEN 1
          ELSE 0
        END
      `);
      console.log('OK Conversion terminee');
    } else {
      console.log('Deja INTEGER');
    }

    await pool.query('UPDATE users SET is_active = 1 WHERE email = $1', ['admin@chefunitplus.com']);
    console.log('Admin mis a is_active = 1');

    const after = await pool.query(
      'SELECT id, email, role, is_active FROM users WHERE email = $1',
      ['admin@chefunitplus.com']
    );
    console.log('Resultat :', JSON.stringify(after.rows[0]));
  } catch (err) {
    console.error('ERREUR :', err.message);
  }
  await pool.end();
}

run();
