const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));

const cols = db.prepare("PRAGMA table_info(formations)").all().map(c => c.name);
let added = 0;

const addCol = (name, type) => {
  if (!cols.includes(name)) {
    db.exec(`ALTER TABLE formations ADD COLUMN ${name} ${type}`);
    console.log(`[OK] ${name} ajoute`);
    added++;
  }
};

addCol('status', "TEXT DEFAULT 'draft'");
addCol('published_at', 'DATETIME');
addCol('published_by', 'TEXT');

// Mettre a jour les formations existantes
db.exec(`UPDATE formations SET status = CASE WHEN is_published = 1 THEN 'published' ELSE 'draft' END WHERE status IS NULL`);

console.log(`[OK] ${added} colonne(s) ajoutee(s)`);
db.close();