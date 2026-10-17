const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

// Lister toutes les tables
const tables = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

console.log('');
console.log('========================================');
console.log(' TABLES (' + tables.length + ')');
console.log('========================================');
console.log('');

tables.forEach(t => {
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get();

  console.log(`\n[${t.name}] - ${cols.length} colonnes, ${count.c} ligne(s)`);
  console.log('  ' + '-'.repeat(50));

  cols.forEach(c => {
    const pk = c.pk ? ' [PK]' : '';
    const nn = c.notnull ? ' NOT NULL' : '';
    const dv = c.dflt_value ? ` DEFAULT ${c.dflt_value}` : '';
    console.log(`    ${c.name.padEnd(25)} ${(c.type || '').padEnd(12)}${pk}${nn}${dv}`);
  });
});

console.log('');
console.log('========================================');
console.log(' FIN');
console.log('========================================');

db.close();