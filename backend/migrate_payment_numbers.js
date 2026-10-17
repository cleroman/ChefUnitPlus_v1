// ChefUnitPlus - Migration payment_numbers
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

// 1. Creer la table
db.exec(`
  CREATE TABLE IF NOT EXISTS payment_numbers (
    id TEXT PRIMARY KEY,
    operator TEXT NOT NULL,
    display_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    reference_format TEXT DEFAULT 'XXX XXX XXXX',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[OK] Table payment_numbers creee');

// 2. Ajouter des exemples
const existing = db.prepare('SELECT COUNT(*) as c FROM payment_numbers').get();
if (existing.c === 0) {
  const now = new Date().toISOString();
  const examples = [
    { operator: 'airtel',   display_name: 'Airtel Money - ChefUnitPlus',   phone_number: '0991234567', reference_format: '099 XXX XXXX' },
    { operator: 'vodacom',  display_name: 'Vodacom M-Pesa - ChefUnitPlus', phone_number: '0812345678', reference_format: '081 XXX XXXX' },
    { operator: 'orange',   display_name: 'Orange Money - ChefUnitPlus',   phone_number: '0893456789', reference_format: '089 XXX XXXX' },
    { operator: 'africell', display_name: 'Africell Money - ChefUnitPlus', phone_number: '0904567890', reference_format: '090 XXX XXXX' },
  ];
  const insert = db.prepare(`
    INSERT INTO payment_numbers (id, operator, display_name, phone_number, reference_format, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);
  for (const ex of examples) {
    insert.run(uuidv4(), ex.operator, ex.display_name, ex.phone_number, ex.reference_format, now, now);
  }
  console.log('[OK] 4 exemples inseres');
} else {
  console.log('[i] ' + existing.c + ' numeros deja presents');
}

// 3. Verification
const rows = db.prepare('SELECT operator, display_name, phone_number FROM payment_numbers').all();
console.log('');
console.log('=== NUMEROS EN BASE ===');
rows.forEach(r => {
  console.log(`  ${r.operator.padEnd(10)} | ${r.display_name.padEnd(35)} | ${r.phone_number}`);
});
db.close();