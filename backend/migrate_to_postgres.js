// =============================================================
// ChefUnitPlus - Migration SQLite -> PostgreSQL
// Usage : node migrate_to_postgres.js
// =============================================================

require('dotenv').config();
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

const SQLITE_PATH = process.env.DB_PATH || './database/chefunitplus.db';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERREUR : DATABASE_URL non defini');
  process.exit(1);
}

async function migrate() {
  console.log('=== Migration SQLite -> PostgreSQL ===');

  // 1) Connexion SQLite
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  console.log('SQLite connecte :', SQLITE_PATH);

  // 2) Connexion PostgreSQL
  const pg = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  console.log('PostgreSQL connecte');

  // 3) Lister les tables
  const tables = sqlite.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).all();

  console.log('Tables trouvees :', tables.map(t => t.name).join(', '));

  // 4) Migrer chaque table
  for (const table of tables) {
    const tableName = table.name;
    console.log(`\n--- Migration : ${tableName} ---`);

    // Lire les donnees
    const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
    console.log(`  ${rows.length} lignes`);

    if (rows.length === 0) continue;

    // Creer la table PostgreSQL
    const columns = Object.keys(rows[0]);
    const columnDefs = columns.map(c => `"${c}" TEXT`).join(', ');

    await pg.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    await pg.query(`CREATE TABLE "${tableName}" (${columnDefs})`);

    // Inserer les donnees
    for (const row of rows) {
      const values = columns.map(c => row[c]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const cols = columns.map(c => `"${c}"`).join(', ');

      await pg.query(
        `INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders})`,
        values
      );
    }

    console.log(`  OK`);
  }

  console.log('\n=== Migration terminee ===');
  sqlite.close();
  await pg.end();
}

migrate().catch(err => {
  console.error('ERREUR :', err);
  process.exit(1);
});
