const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));

const users = db.prepare("SELECT id, full_name, email, role, is_active, LEFT(password_hash, 20) as hash_preview FROM users ORDER BY role").all();
console.log('Total: ' + users.length + ' utilisateurs');
console.log('');
users.forEach(u => {
  console.log('[' + u.role + '] ' + u.full_name);
  console.log('   email      : ' + u.email);
  console.log('   is_active  : ' + u.is_active);
  console.log('   hash       : ' + u.hash_preview + '...');
  console.log('');
});

// Verifier la structure de la table users
console.log('=== STRUCTURE TABLE users ===');
const cols = db.prepare("PRAGMA table_info(users)").all();
cols.forEach(c => console.log('  - ' + c.name + ' (' + c.type + ')'));

db.close();