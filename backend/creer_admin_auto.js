const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://chefunitplus_user:8Fmyat0yjscDkIS7Jfpmkdjeg4onENOn@dpg-dasejhh7lnhs738rp620-a.frankfurt-postgres.render.com/chefunitplus',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // 1) Voir les colonnes de users
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' ORDER BY ordinal_position
    `);
    const columnNames = cols.rows.map(r => r.column_name);
    console.log('Colonnes de users :', columnNames.join(', '));
    console.log('');

    // 2) Detecter les noms de colonnes
    const emailCol = columnNames.find(c => ['email', 'mail', 'email_address'].includes(c));
    const passCol  = columnNames.find(c => ['password', 'password_hash', 'hashed_password', 'pwd', 'mot_de_passe'].includes(c));
    const roleCol  = columnNames.find(c => ['role', 'user_role', 'type'].includes(c));
    const nameCol  = columnNames.find(c => ['full_name', 'fullname', 'name', 'nom', 'nom_complet'].includes(c));
    const activeCol = columnNames.find(c => ['is_active', 'active', 'enabled', 'actif'].includes(c));

    console.log('Detection :');
    console.log('  email    ->', emailCol);
    console.log('  password ->', passCol);
    console.log('  role     ->', roleCol);
    console.log('  name     ->', nameCol);
    console.log('  active   ->', activeCol);
    console.log('');

    if (!emailCol || !passCol) {
      console.error('ERREUR : impossible de trouver email ou password');
      await pool.end();
      return;
    }

    // 3) Hash du mot de passe
    const email = 'admin@chefunitplus.com';
    const password = 'admin123';
    const hashed = await bcrypt.hash(password, 10);

    // 4) Supprimer ancien admin si existe
    await pool.query(`DELETE FROM users WHERE ${emailCol} = $1`, [email]);
    console.log('Ancien admin supprime (si existait)');

    // 5) Construire l'INSERT dynamiquement
    const insertCols = [emailCol, passCol];
    const insertVals = [email, hashed];

    if (roleCol) {
      insertCols.push(roleCol);
      insertVals.push('admin');
    }
    if (nameCol) {
      insertCols.push(nameCol);
      insertVals.push('Administrateur Principal');
    }
    if (activeCol) {
      insertCols.push(activeCol);
      insertVals.push(true);
    }

    const placeholders = insertCols.map((_, i) => '$' + (i + 1)).join(', ');
    const sql = `INSERT INTO users (${insertCols.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    const res = await pool.query(sql, insertVals);
    console.log('');
    console.log('OK Admin cree :');
    console.log(JSON.stringify(res.rows[0], null, 2));

  } catch (err) {
    console.error('ERREUR :', err.message);
  }
  await pool.end();
}

run();
