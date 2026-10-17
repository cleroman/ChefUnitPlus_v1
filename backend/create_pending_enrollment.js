const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

console.log('Base: ' + dbPath);
console.log('');

// ============================================================
// 1. Trouver un apprenant
// ============================================================
const learner = db.prepare(`
  SELECT id, full_name, email FROM users 
  WHERE role = 'apprenant' AND is_active = 1 
  LIMIT 1
`).get();

if (!learner) {
  console.log('ERREUR: Aucun apprenant trouve');
  console.log('Creation d\'un apprenant de test...');
  
  const learnerId = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, full_name, email, password_hash, role, is_active, created_at)
    VALUES (?, 'Apprenant Test', 'apprenant.test@chefunitplus.com', 'hash', 'apprenant', 1, ?)
  `).run(learnerId, now);
  
  console.log('Apprenant cree: ' + learnerId);
  process.exit(0);
}

console.log('Apprenant: ' + learner.full_name + ' (' + learner.email + ')');
console.log('');

// ============================================================
// 2. Trouver une formation
// ============================================================
const formation = db.prepare(`
  SELECT id, title, price, director_id FROM formations 
  WHERE director_id IS NOT NULL
  LIMIT 1
`).get();

if (!formation) {
  console.log('ERREUR: Aucune formation avec directeur');
  process.exit(1);
}

console.log('Formation: ' + formation.title + ' (' + formation.price + ' USD)');
console.log('Directeur ID: ' + formation.director_id);
console.log('');

// ============================================================
// 3. Trouver le directeur
// ============================================================
const director = db.prepare(`
  SELECT id, full_name, email FROM users WHERE id = ?
`).get(formation.director_id);

if (!director) {
  console.log('ERREUR: Directeur introuvable');
  process.exit(1);
}

console.log('Directeur: ' + director.full_name + ' (' + director.email + ')');
console.log('');

// ============================================================
// 4. Verifier si un enrollment pending existe deja
// ============================================================
const existing = db.prepare(`
  SELECT id FROM enrollments 
  WHERE learner_id = ? AND formation_id = ? AND status = 'pending_payment'
`).get(learner.id, formation.id);

if (existing) {
  console.log('Un enrollment pending existe deja: ' + existing.id);
  console.log('On va le mettre a jour pour simuler un paiement...');
  
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE enrollments 
    SET paid_at = ?, amount_paid = ?, payment_ref = ?, status = 'pending_payment'
    WHERE id = ?
  `).run(now, formation.price, 'TEST-' + Date.now(), existing.id);
  
  console.log('Enrollment mis a jour: ' + existing.id);
} else {
  // ============================================================
  // 5. Creer un nouvel enrollment
  // ============================================================
  const enrollmentId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO enrollments (
      id, learner_id, formation_id, formation_title, status,
      amount_paid, payment_ref, requested_at, paid_at,
      phone, account_name, progress_percent
    ) VALUES (?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, 0)
  `).run(
    enrollmentId,
    learner.id,
    formation.id,
    formation.title,
    formation.price,
    'TEST-' + Date.now(),
    now,
    now,
    '+243000000000',
    learner.full_name
  );
  
  console.log('Enrollment cree: ' + enrollmentId);
}

console.log('');

// ============================================================
// 6. Creer une notification pour le directeur
// ============================================================
try {
  const notifId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
    VALUES (?, ?, 'Nouveau paiement a valider', ?, 'enrollment_pending', 0, '/director/enrollments', ?)
  `).run(
    notifId,
    director.id,
    learner.full_name + ' a paye ' + formation.price + ' USD pour "' + formation.title + '". En attente de validation.',
    now
  );
  
  console.log('Notification creee: ' + notifId);
  console.log('  -> Pour: ' + director.full_name);
  console.log('  -> Type: enrollment_pending');
} catch (e) {
  console.log('ERREUR notification: ' + e.message);
}

console.log('');

// ============================================================
// 7. Verifier le resultat
// ============================================================
console.log('=== VERIFICATION ===');
const pending = db.prepare(`
  SELECT 
    e.id, e.status, e.amount_paid, e.paid_at,
    u.full_name as learner_name,
    f.title as formation_title
  FROM enrollments e
  LEFT JOIN users u ON u.id = e.learner_id
  LEFT JOIN formations f ON f.id = e.formation_id
  WHERE e.status = 'pending_payment' AND e.paid_at IS NOT NULL
`).all();

console.log('Enrollments payes en attente de validation: ' + pending.length);
pending.forEach((e, i) => {
  console.log('  [' + (i+1) + '] ' + e.learner_name + ' -> ' + e.formation_title);
  console.log('      Montant: ' + e.amount_paid + ' USD');
  console.log('      Paye le: ' + e.paid_at);
  console.log('      ID: ' + e.id);
});

console.log('');

const notifs = db.prepare(`
  SELECT n.id, n.title, n.message, n.type, u.full_name as user_name
  FROM notifications n
  LEFT JOIN users u ON u.id = n.user_id
  WHERE n.type = 'enrollment_pending'
  ORDER BY n.created_at DESC
`).all();

console.log('Notifications en attente: ' + notifs.length);
notifs.forEach((n, i) => {
  console.log('  [' + (i+1) + '] ' + n.title + ' -> ' + n.user_name);
  console.log('      ' + n.message);
});

db.close();
console.log('');
console.log('=== FIN ===');