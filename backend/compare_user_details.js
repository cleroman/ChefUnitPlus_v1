const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const possiblePaths = [
  path.join(__dirname, 'database', 'chefunitplus.db'),
  path.join(__dirname, 'database', 'database.db'),
];
let dbPath = null;
for (const p of possiblePaths) { if (fs.existsSync(p)) { dbPath = p; break; } }
if (!dbPath) { console.log('DB introuvable'); process.exit(1); }

const db = new Database(dbPath);

console.log('========================================');
console.log('TABLE user_details');
console.log('========================================');
const cols = db.prepare("PRAGMA table_info(user_details)").all();
console.log('Nombre total de colonnes : ' + cols.length);
cols.forEach((c, i) => {
  console.log(`  ${(i+1).toString().padStart(2,' ')}. ${c.name} (${c.type})${c.notnull ? ' NOT NULL' : ''}${c.dflt_value ? ' DEFAULT ' + c.dflt_value : ''}`);
});

console.log('');
console.log('========================================');
console.log('COLONNES DANS L\'INSERT (auth.controller.js)');
console.log('========================================');
const insertCols = [
  'id', 'user_id',
  'post_nom', 'prenom', 'prenom2', 'sexe', 'date_naissance', 'lieu_naissance',
  'province', 'ville', 'commune', 'quartier', 'avenue', 'numero', 'pays',
  'groupe_scout', 'numero_affiliation', 'district', 'association',
  'branche', 'date_entree_scout', 'fonction_scout',
  'profession', 'niveau_etude', 'antecedents_medicaux', 'camps', 'contacts_urgence',
  'engagement_accepte', 'engagement_date',
  'totem', 'fonctions_camps', 'personnes_prevenir', 'conditions_engagement', 'qr_code_data',
  'created_at', 'updated_at'
];
console.log('Nombre de colonnes dans l\'INSERT : ' + insertCols.length);
insertCols.forEach((c, i) => {
  console.log(`  ${(i+1).toString().padStart(2,' ')}. ${c}`);
});

console.log('');
console.log('========================================');
console.log('COLONNES MANQUANTES');
console.log('========================================');
const tableCols = cols.map(c => c.name);
const missing = tableCols.filter(c => !insertCols.includes(c));
console.log('Nombre de colonnes manquantes : ' + missing.length);
missing.forEach((c, i) => console.log(`  ${(i+1).toString().padStart(2,' ')}. ${c}`));

console.log('');
console.log('========================================');
console.log('COLONNES EN TROP DANS L\'INSERT');
console.log('========================================');
const extra = insertCols.filter(c => !tableCols.includes(c));
console.log('Nombre de colonnes en trop : ' + extra.length);
extra.forEach((c, i) => console.log(`  ${(i+1).toString().padStart(2,' ')}. ${c}`));

console.log('');
console.log('========================================');
console.log('SYNTHESE');
console.log('========================================');
console.log('Table user_details : ' + cols.length + ' colonnes');
console.log('INSERT             : ' + insertCols.length + ' colonnes');
console.log('Manquantes         : ' + missing.length + ' colonnes');
console.log('En trop            : ' + extra.length + ' colonnes');

db.close();