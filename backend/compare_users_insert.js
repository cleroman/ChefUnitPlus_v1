const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Chercher le fichier de base de données
const possiblePaths = [
  path.join(__dirname, 'database', 'chefunitplus.db'),
  path.join(__dirname, 'database', 'database.db'),
  path.join(__dirname, 'chefunitplus.db'),
  path.join(__dirname, 'data', 'chefunitplus.db'),
  path.join(__dirname, 'src', 'database', 'chefunitplus.db'),
];

let dbPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    dbPath = p;
    break;
  }
}

if (!dbPath) {
  console.log('ERREUR: Fichier de base de donnees introuvable');
  console.log('Chemins testes:');
  possiblePaths.forEach(p => console.log('  - ' + p));
  process.exit(1);
}

console.log('Base de donnees: ' + dbPath);
console.log('');

const db = new Database(dbPath);

// Structure de la table users
const columns = db.prepare("PRAGMA table_info(users)").all();
console.log('========================================');
console.log('STRUCTURE DE LA TABLE USERS');
console.log('========================================');
console.log('Nombre total de colonnes : ' + columns.length);
console.log('');
console.log('Liste des colonnes :');
columns.forEach((col, i) => {
  const num = (i + 1).toString().padStart(2, ' ');
  console.log(`  ${num}. ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ' DEFAULT ' + col.dflt_value : ''}`);
});

console.log('');
console.log('========================================');
console.log('COLONNES DANS L\'INSERT (auth.controller.js)');
console.log('========================================');
const insertColumns = [
  'id', 'full_name', 'email', 'phone', 'password_hash', 'role',
  'post_nom', 'prenom', 'sexe', 'date_naissance', 'lieu_naissance',
  'group_id', 'totem', 'adresse',
  'is_active', 'created_at', 'updated_at'
];
console.log('Nombre de colonnes dans l\'INSERT : ' + insertColumns.length);
insertColumns.forEach((c, i) => {
  console.log(`  ${(i + 1).toString().padStart(2, ' ')}. ${c}`);
});

console.log('');
console.log('========================================');
console.log('COLONNES MANQUANTES DANS L\'INSERT');
console.log('========================================');
const tableCols = columns.map(c => c.name);
const missing = tableCols.filter(c => !insertColumns.includes(c));
console.log('Nombre de colonnes manquantes : ' + missing.length);
missing.forEach((c, i) => {
  const colInfo = columns.find(col => col.name === c);
  console.log(`  ${(i + 1).toString().padStart(2, ' ')}. ${c} (${colInfo.type})${colInfo.notnull ? ' NOT NULL' : ''}${colInfo.dflt_value ? ' DEFAULT ' + colInfo.dflt_value : ''}`);
});

console.log('');
console.log('========================================');
console.log('SYNTHESE');
console.log('========================================');
console.log('Table users       : ' + columns.length + ' colonnes');
console.log('INSERT            : ' + insertColumns.length + ' colonnes');
console.log('Manquantes        : ' + missing.length + ' colonnes');
console.log('');
console.log('ERREUR ATTENDUE   : ' + insertColumns.length + ' values for ' + columns.length + ' columns');
console.log('ERREUR REELLE     : 35 values for 36 columns');
console.log('');
console.log('=> La table a probablement ete modifiee APRES la creation de l\'INSERT.');

db.close();