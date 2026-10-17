const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));

console.log('=== DERNIERS ENROLLMENTS ===');
const enrolls = db.prepare(`
  SELECT e.id, e.status, e.paid_at, e.amount_paid, e.payment_ref,
         u.full_name as learner_name, f.title as formation_title
  FROM enrollments e
  LEFT JOIN users u ON u.id = e.learner_id
  LEFT JOIN formations f ON f.id = e.formation_id
  ORDER BY e.requested_at DESC
  LIMIT 10
`).all();

enrolls.forEach((e, i) => {
  console.log('[' + (i+1) + '] ' + e.learner_name + ' -> ' + e.formation_title);
  console.log('    status : ' + e.status);
  console.log('    paye   : ' + (e.paid_at || 'NON'));
  console.log('    montant: ' + (e.amount_paid || 0) + ' USD');
  console.log('    ref    : ' + (e.payment_ref || 'NON'));
  console.log('');
});

console.log('=== NOTIFICATIONS APRES PAIEMENT ===');
const notifs = db.prepare(`
  SELECT n.title, n.message, n.type, n.is_read, n.created_at,
         u.full_name as user_name, u.role as user_role
  FROM notifications n
  LEFT JOIN users u ON u.id = n.user_id
  WHERE n.type IN ('payment_confirmed', 'enrollment_pending', 'enrollment_validated')
  ORDER BY n.created_at DESC
  LIMIT 10
`).all();

notifs.forEach((n, i) => {
  console.log('[' + (i+1) + '] [' + n.user_role + '] ' + n.user_name);
  console.log('    ' + n.title + ' (type=' + n.type + ')');
  console.log('    ' + n.message);
  console.log('');
});

db.close();