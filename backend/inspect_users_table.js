const Database = require('better-sqlite3');
const path = require('path');

// Chercher le fichier de base de données
const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

console.log('=== STRUCTURE DE LA TABLE USERS ===\n');
const columns = db.prepare("PRAGMA table_info(users)").all();
console.log(`Nombre total de colonnes : ${columns.length}\n`);
columns.forEach((col, i) => {
  console.log(`${i + 1}. ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? 'DEFAULT ' + col.dflt_value : ''}`);
});

console.log('\n=== NOMS DES COLONNES ===\n');
console.log(columns.map(c => c.name).join(', '));

db.close();