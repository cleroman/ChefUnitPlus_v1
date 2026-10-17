// ChefUnitPlus - Migration : colonnes de publication
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

const cols = db.prepare("PRAGMA table_info(formations)").all();
const names = cols.map(c => c.name);

let added = 0;

if (!names.includes('status')) {
  db.exec(`ALTER TABLE formations ADD COLUMN status TEXT DEFAULT 'draft'`);
  console.log('[OK] status ajoute');
  added++;
}
if (!names.includes('published_at')) {
  db.exec(`ALTER TABLE formations ADD COLUMN published_at DATETIME`);
  console.log('[OK] published_at ajoute');
  added++;
}
if (!names.includes('published_by')) {
  db.exec(`ALTER TABLE formations ADD COLUMN published_by TEXT`);
  console.log('[OK] published_by ajoute');
  added++;
}
if (!names.includes('trainer_id')) {
  db.exec(`ALTER TABLE formations ADD COLUMN trainer_id TEXT`);
  console.log('[OK] trainer_id ajoute');
  added++;
}
if (!names.includes('start_date')) {
  db.exec(`ALTER TABLE formations ADD COLUMN start_date DATE`);
  console.log('[OK] start_date ajoute');
  added++;
}
if (!names.includes('end_date')) {
  db.exec(`ALTER TABLE formations ADD COLUMN end_date DATE`);
  console.log('[OK] end_date ajoute');
  added++;
}
if (!names.includes('duration_hours')) {
  db.exec(`ALTER TABLE formations ADD COLUMN duration_hours INTEGER`);
  console.log('[OK] duration_hours ajoute');
  added++;
}

// Mettre a jour les formations existantes
db.exec(`UPDATE formations SET status = 'draft' WHERE status IS NULL`);

console.log('');
console.log(`=== ${added} colonne(s) ajoutee(s) ===`);

const newCols = db.prepare("PRAGMA table_info(formations)").all();
console.log(`${newCols.length} colonnes au total`);

db.close();