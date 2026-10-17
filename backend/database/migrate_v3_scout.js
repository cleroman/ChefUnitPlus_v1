// =============================================================
// ChefUnitPlus - Migration v3 : Inscription Scout complete
// =============================================================

const db = require('../src/config/database');

console.log('Migration v3 : ajout des champs scout...');
console.log('');

// --- 1. Etendre la table users ---
const userColumns = [
    ['post_nom', 'TEXT'],
    ['prenom', 'TEXT'],
    ['sexe', 'TEXT'],
    ['date_naissance', 'DATE'],
    ['lieu_naissance', 'TEXT'],
    ['photo_url', 'TEXT'],
];

const existingUserCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);

for (const [name, type] of userColumns) {
    if (!existingUserCols.includes(name)) {
        db.exec('ALTER TABLE users ADD COLUMN ' + name + ' ' + type);
        console.log('  + users.' + name);
    }
}

// --- 2. Etendre la table user_details ---
const detailColumns = [
    ['province', 'TEXT'],
    ['commune', 'TEXT'],
    ['quartier', 'TEXT'],
    ['avenue', 'TEXT'],
    ['numero', 'TEXT'],
    ['groupe_scout', 'TEXT'],
    ['numero_affiliation', 'TEXT'],
    ['district', 'TEXT'],
    ['association', 'TEXT'],
    ['profession', 'TEXT'],
    ['branche', 'TEXT'],
    ['date_entree_scout', 'DATE'],
    ['fonction_scout', 'TEXT'],
    ['antecedents_medicaux', 'TEXT'],
    ['attestation_camp_url', 'TEXT'],
    ['engagement_accepte', 'INTEGER DEFAULT 0'],
    ['engagement_date', 'DATETIME'],
];

const existingDetailCols = db.prepare('PRAGMA table_info(user_details)').all().map(c => c.name);

for (const [name, type] of detailColumns) {
    if (!existingDetailCols.includes(name)) {
        db.exec('ALTER TABLE user_details ADD COLUMN ' + name + ' ' + type);
        console.log('  + user_details.' + name);
    }
}

// --- 3. Nouvelle table scout_camps ---
db.exec(`
  CREATE TABLE IF NOT EXISTS scout_camps (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    nom_camp TEXT NOT NULL,
    annee INTEGER,
    lieu TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('  + table scout_camps');

// --- 4. Nouvelle table emergency_contacts ---
db.exec(`
  CREATE TABLE IF NOT EXISTS emergency_contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    post_nom TEXT,
    prenom TEXT,
    telephone TEXT NOT NULL,
    adresse TEXT,
    relation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('  + table emergency_contacts');

console.log('');
console.log('Migration v3 terminee avec succes !');
