const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

console.log('DB:', dbPath);

// Colonnes a ajouter
const columns = [
  ['statut', "TEXT DEFAULT 'pending'"],
  ['fonction', 'TEXT'],
  ['registration_code', 'TEXT'],
  ['code_is_used', 'INTEGER DEFAULT 0'],
  ['code_expires_at', 'TEXT'],
  ['code_attempts', 'INTEGER DEFAULT 0'],
  ['code_blocked_until', 'TEXT'],
  ['code_used_at', 'TEXT'],
  ['proofs_submitted_at', 'TEXT'],
  ['validated_at', 'TEXT'],
  ['buchettes', 'INTEGER DEFAULT 0'],
  ['group_id', 'TEXT'],
  ['confirmation_email', 'TEXT'],
  ['full_name', 'TEXT'],
  ['phone', 'TEXT'],
  ['is_active', 'INTEGER DEFAULT 1'],
  ['created_at', 'DATETIME'],
  ['updated_at', 'DATETIME'],
];

let added = 0, skipped = 0;

for (const [name, type] of columns) {
  try {
    db.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
    console.log(`  + ${name}`);
    added++;
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      skipped++;
    } else {
      console.log(`  ! ${name}: ${e.message}`);
    }
  }
}

console.log(`\nResultat : ${added} ajoutees, ${skipped} deja presentes`);

// Afficher le schema final
const cols = db.prepare('PRAGMA table_info(users)').all();
console.log(`\nSchema users (${cols.length} colonnes) :`);
cols.forEach(c => console.log(`  - ${c.name} (${c.type})`));

db.close();
