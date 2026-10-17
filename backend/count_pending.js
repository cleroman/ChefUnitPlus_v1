const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));

// ============================================================
// 1. COMPTER LES PAIEMENTS EN ATTENTE
// ============================================================
const pending = db.prepare(`
  SELECT COUNT(*) as count
  FROM enrollments
  WHERE status = 'pending_payment' AND paid_at IS NOT NULL
`).get();

console.log('========================================');
console.log('  PAIEMENTS EN ATTENTE DE VALIDATION');
console.log('========================================');
console.log('');
console.log('  NOMBRE : ' + pending.count);
console.log('');

// ============================================================
// 2. DETAILS DES PAIEMENTS EN ATTENTE
// ============================================================
if (pending.count > 0) {
  console.log('========================================');
  console.log('  DETAILS');
  console.log('========================================');
  console.log('');

  const rows = db.prepare(`
    SELECT 
      e.id,
      e.amount_paid,
      e.payment_ref,
      e.paid_at,
      u.full_name as learner_name,
      f.title as formation_title,
      f.director_id,
      d.full_name as director_name
    FROM enrollments e
    LEFT JOIN users u ON u.id = e.learner_id
    LEFT JOIN formations f ON f.id = e.formation_id
    LEFT JOIN users d ON d.id = f.director_id
    WHERE e.status = 'pending_payment' AND e.paid_at IS NOT NULL
    ORDER BY e.paid_at DESC
  `).all();

  rows.forEach((e, i) => {
    console.log('  [' + (i+1) + '] ' + e.learner_name);
    console.log('      Formation : ' + e.formation_title);
    console.log('      Montant   : ' + e.amount_paid + ' USD');
    console.log('      Paye le   : ' + e.paid_at);
    console.log('      Reference : ' + (e.payment_ref || 'NON'));
    console.log('      Directeur : ' + (e.director_name || 'NON ASSIGNE'));
    console.log('      ID        : ' + e.id);
    console.log('');
  });
} else {
  console.log('  Aucun paiement en attente.');
  console.log('');
}

// ============================================================
// 3. STATISTIQUES GLOBALES
// ============================================================
console.log('========================================');
console.log('  STATISTIQUES GLOBALES');
console.log('========================================');
console.log('');

const stats = db.prepare(`
  SELECT 
    status,
    COUNT(*) as count,
    SUM(amount_paid) as total
  FROM enrollments
  GROUP BY status
`).all();

stats.forEach(s => {
  console.log('  ' + s.status.padEnd(20) + ' : ' + s.count + ' enrollment(s) | ' + (s.total || 0) + ' USD');
});

db.close();