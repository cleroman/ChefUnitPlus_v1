const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

console.log('=== ENROLLMENT CIBLE ===');
const target = db.prepare(`
  SELECT e.*, u.full_name as learner_name, f.title as formation_title
  FROM enrollments e
  LEFT JOIN users u ON u.id = e.learner_id
  LEFT JOIN formations f ON f.id = e.formation_id
  WHERE e.id = '86633cea-ce17-4e31-9db1-fab96b7c287e'
`).get();

if (target) {
  console.log('Apprenant: ' + target.learner_name);
  console.log('Formation: ' + target.formation_title);
  console.log('Statut: ' + target.status);
  console.log('Montant: ' + target.amount_paid);
  console.log('Paye le: ' + target.paid_at);
  console.log('Valide le: ' + (target.validated_at || 'PAS ENCORE'));
  console.log('Valide par: ' + (target.validated_by || 'PAS ENCORE'));
  console.log('Numero recu: ' + (target.receipt_number || 'PAS ENCORE'));
} else {
  console.log('Enrollment introuvable');
}
console.log('');

console.log('=== TOUS LES ENROLLMENTS ===');
const all = db.prepare(`
  SELECT e.id, e.status, e.paid_at, e.validated_at,
         u.full_name as learner_name, f.title as formation_title
  FROM enrollments e
  LEFT JOIN users u ON u.id = e.learner_id
  LEFT JOIN formations f ON f.id = e.formation_id
  ORDER BY e.requested_at DESC
`).all();

all.forEach((e, i) => {
  console.log('[' + (i+1) + '] ' + e.learner_name + ' -> ' + e.formation_title);
  console.log('    status=' + e.status + ' | paye=' + (e.paid_at || 'non') + ' | valide=' + (e.validated_at || 'non'));
});
console.log('');

console.log('=== NOTIFICATIONS ===');
const notifs = db.prepare(`
  SELECT n.id, n.title, n.message, n.type, n.is_read, n.created_at,
         u.full_name as user_name, u.role as user_role
  FROM notifications n
  LEFT JOIN users u ON u.id = n.user_id
  ORDER BY n.created_at DESC
  LIMIT 20
`).all();

notifs.forEach((n, i) => {
  console.log('[' + (i+1) + '] [' + n.user_role + '] ' + n.user_name);
  console.log('    ' + n.title + ' (type=' + n.type + ', lue=' + n.is_read + ')');
  console.log('    ' + n.created_at);
});
console.log('');

console.log('=== STATS ===');
const totalEnrollments = db.prepare("SELECT COUNT(*) as c FROM enrollments").get();
const pendingCount = db.prepare("SELECT COUNT(*) as c FROM enrollments WHERE status = 'pending_payment'").get();
const approvedCount = db.prepare("SELECT COUNT(*) as c FROM enrollments WHERE status = 'approved'").get();
const totalNotifs = db.prepare("SELECT COUNT(*) as c FROM notifications").get();
const unreadNotifs = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE is_read = 0").get();

console.log('Enrollments total: ' + totalEnrollments.c);
console.log('  - pending_payment: ' + pendingCount.c);
console.log('  - approved: ' + approvedCount.c);
console.log('Notifications total: ' + totalNotifs.c);
console.log('  - non lues: ' + unreadNotifs.c);

db.close();