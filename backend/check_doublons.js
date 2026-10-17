const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));

// Doublons (meme user + formation)
const dup = db.prepare(`
  SELECT user_id, formation_id, COUNT(*) as c
  FROM payment_requests
  WHERE status IN ('pending', 'validated')
  GROUP BY user_id, formation_id
  HAVING c > 1
`).all();

console.log('');
console.log('=== DOUBLONS ===');
if (dup.length === 0) {
  console.log('Aucun doublon detecte');
} else {
  dup.forEach(d => {
    console.log(`  user_id: ${d.user_id}, formation_id: ${d.formation_id}, count: ${d.c}`);
  });
}

// Tous les paiements
const all = db.prepare('SELECT * FROM payment_requests').all();
console.log('');
console.log(`=== TOTAL : ${all.length} paiement(s) ===`);

db.close();