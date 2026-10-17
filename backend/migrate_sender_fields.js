const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

console.log('');
console.log('=== ETAT ACTUEL ===');
const beforeCols = db.prepare("PRAGMA table_info(payment_requests)").all();
console.log(`${beforeCols.length} colonnes`);
beforeCols.forEach(c => console.log(`  ${c.name} (${c.type})`));

const beforeNames = beforeCols.map(c => c.name);

console.log('');
console.log('=== MIGRATION ===');

let added = 0;

if (!beforeNames.includes('sender_name')) {
  db.exec(`ALTER TABLE payment_requests ADD COLUMN sender_name TEXT`);
  console.log('[OK] sender_name ajoutee');
  added++;
} else {
  console.log('[i] sender_name existe deja');
}

if (!beforeNames.includes('sender_phone')) {
  db.exec(`ALTER TABLE payment_requests ADD COLUMN sender_phone TEXT`);
  console.log('[OK] sender_phone ajoutee');
  added++;
} else {
  console.log('[i] sender_phone existe deja');
}

console.log('');
console.log('=== NOUVELLE STRUCTURE ===');
const afterCols = db.prepare("PRAGMA table_info(payment_requests)").all();
console.log(`${afterCols.length} colonnes`);
afterCols.forEach(c => console.log(`  ${c.name} (${c.type})`));

console.log('');
console.log(`=== ${added} colonne(s) ajoutee(s) ===`);

db.close();