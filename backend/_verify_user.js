const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath, { readonly: true });

console.log('Base :', dbPath);
console.log('');

// Dernier user cree
const user = db.prepare(`
  SELECT id, email, full_name, phone, role, is_active,
         statut, fonction, registration_code, code_is_used,
         code_expires_at, code_attempts, buchettes,
         created_at
  FROM users
  ORDER BY created_at DESC
  LIMIT 1
`).get();

if (!user) {
  console.log('Aucun utilisateur trouve');
  process.exit(0);
}

console.log('========================================');
console.log('  DERNIER USER CREE');
console.log('========================================');
console.log('');
console.log('  ID              :', user.id);
console.log('  Email           :', user.email);
console.log('  Nom complet     :', user.full_name);
console.log('  Phone           :', user.phone);
console.log('  Role            :', user.role);
console.log('  is_active       :', user.is_active);
console.log('');
console.log('  >>> CHAMPS CLES <<<');
console.log('');
console.log('  statut          :', user.statut || 'VIDE');
console.log('  fonction        :', user.fonction || 'VIDE');
console.log('  registration_code :', user.registration_code || 'VIDE');
console.log('  code_is_used    :', user.code_is_used);
console.log('  code_expires_at :', user.code_expires_at || 'VIDE');
console.log('  code_attempts   :', user.code_attempts);
console.log('  buchettes       :', user.buchettes);
console.log('  created_at      :', user.created_at);
console.log('');

// Verdict
console.log('========================================');
console.log('  VERDICT');
console.log('========================================');
console.log('');

let ok = 0;
let ko = 0;

if (user.statut && user.statut !== '') {
  console.log('  [OK] statut        :', user.statut);
  ok++;
} else {
  console.log('  [KO] statut        : VIDE');
  ko++;
}

if (user.fonction && user.fonction !== '') {
  console.log('  [OK] fonction      :', user.fonction);
  ok++;
} else {
  console.log('  [KO] fonction      : VIDE');
  ko++;
}

if (user.registration_code && user.registration_code !== '') {
  console.log('  [OK] code          :', user.registration_code);
  ok++;
} else {
  console.log('  [KO] code          : VIDE');
  ko++;
}

console.log('');
console.log('  Resultat : ' + ok + ' OK / ' + ko + ' KO');

if (ko === 0) {
  console.log('');
  console.log('  >>> TOUT EST CORRECT <<<');
  console.log('');
  console.log('  Le user RAS a bien :');
  console.log('    - statut = awaiting_validation');
  console.log('    - fonction = RAS');
  console.log('    - registration_code = ' + user.registration_code);
} else {
  console.log('');
  console.log('  >>> PROBLEME PERSISTE <<<');
}

db.close();
