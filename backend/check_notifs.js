const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));

console.log('=== TYPES DE NOTIFICATIONS ===');
const types = db.prepare("SELECT type, COUNT(*) as count FROM notifications GROUP BY type").all();
types.forEach(t => console.log('  ' + t.type + ' : ' + t.count));
console.log('');

console.log('=== 15 DERNIERES NOTIFICATIONS ===');
const notifs = db.prepare(`
  SELECT n.id, n.title, n.message, n.type, n.is_read, n.created_at,
         u.full_name as user_name, u.role as user_role
  FROM notifications n
  LEFT JOIN users u ON u.id = n.user_id
  ORDER BY n.created_at DESC
  LIMIT 15
`).all();

notifs.forEach((n, i) => {
  console.log('[' + (i+1) + '] [' + n.user_role + '] ' + n.user_name);
  console.log('    ' + n.title + ' (type=' + n.type + ', lue=' + n.is_read + ')');
  console.log('    ' + n.message);
  console.log('    ' + n.created_at);
  console.log('');
});

console.log('=== ENROLLMENTS PAR STATUT ===');
const stats = db.prepare("SELECT status, COUNT(*) as count FROM enrollments GROUP BY status").all();
stats.forEach(s => console.log('  ' + s.status + ' : ' + s.count));

console.log('');
console.log('=== DERNIERS ENROLLMENTS ===');
const enrolls = db.prepare(`
  SELECT e.id, e.status, e.paid_at, e.validated_at, e.amount_paid, e.receipt_number,
         u.full_name as learner_name, f.title as formation_title
  FROM enrollments e
  LEFT JOIN users u ON u.id = e.learner_id
  LEFT JOIN formations f ON f.id = e.formation_id
  ORDER BY e.requested_at DESC
  LIMIT 5
`).all();

enrolls.forEach((e, i) => {
  console.log('[' + (i+1) + '] ' + e.learner_name + ' -> ' + e.formation_title);
  console.log('    status=' + e.status + ' | montant=' + e.amount_paid + ' USD');
  console.log('    paye=' + (e.paid_at || 'non') + ' | valide=' + (e.validated_at || 'non'));
  console.log('    recu=' + (e.receipt_number || 'non'));
  console.log('');
});

db.close();