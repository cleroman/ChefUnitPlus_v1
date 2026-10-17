const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Trouver la base
const possiblePaths = [
  path.join(__dirname, 'database', 'chefunitplus.db'),
  path.join(__dirname, 'database', 'database.db'),
  path.join(__dirname, 'chefunitplus.db'),
  path.join(__dirname, 'data', 'chefunitplus.db'),
  path.join(__dirname, 'src', 'database', 'chefunitplus.db'),
];

let dbPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) { dbPath = p; break; }
}

if (!dbPath) {
  console.log('ERREUR: Base de donnees introuvable');
  console.log('Chemins testes:');
  possiblePaths.forEach(p => console.log('  - ' + p));
  process.exit(1);
}

console.log('Base de donnees: ' + dbPath);
console.log('');

const db = new Database(dbPath);

// ============================================================
// 1. Structure de la table enrollments
// ============================================================
console.log('=== STRUCTURE TABLE enrollments ===');
try {
  const cols = db.prepare("PRAGMA table_info(enrollments)").all();
  console.log('Colonnes (' + cols.length + '):');
  cols.forEach(c => console.log('  - ' + c.name + ' (' + c.type + ')'));
} catch (e) {
  console.log('ERREUR: ' + e.message);
}
console.log('');

// ============================================================
// 2. Tous les statuts disponibles
// ============================================================
console.log('=== STATUTS DANS enrollments ===');
try {
  const statuses = db.prepare("SELECT status, COUNT(*) as count FROM enrollments GROUP BY status").all();
  if (statuses.length === 0) {
    console.log('  Aucun enrollment dans la base');
  } else {
    statuses.forEach(s => console.log('  ' + s.status + ' : ' + s.count));
  }
} catch (e) {
  console.log('ERREUR: ' + e.message);
}
console.log('');

// ============================================================
// 3. Enrollments en attente (pending)
// ============================================================
console.log('=== ENROLLMENTS EN ATTENTE DE VALIDATION ===');
try {
  const pending = db.prepare(`
    SELECT 
      e.id,
      e.user_id,
      e.formation_id,
      e.status,
      e.payment_status,
      e.created_at,
      u.full_name as learner_name,
      u.email as learner_email,
      f.title as formation_title,
      f.director_id
    FROM enrollments e
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN formations f ON f.id = e.formation_id
    WHERE e.status = 'pending' OR e.payment_status = 'paid_pending'
    ORDER BY e.created_at DESC
  `).all();

  if (pending.length === 0) {
    console.log('  Aucun enrollment en attente');
  } else {
    console.log('  Total: ' + pending.length);
    console.log('');
    pending.forEach((e, i) => {
      console.log('  [' + (i+1) + '] Enrollment:');
      console.log('      id            : ' + e.id);
      console.log('      Apprenant     : ' + (e.learner_name || 'N/A') + ' (' + (e.learner_email || 'N/A') + ')');
      console.log('      Formation     : ' + (e.formation_title || 'N/A'));
      console.log('      Statut        : ' + e.status);
      console.log('      Paiement      : ' + (e.payment_status || 'N/A'));
      console.log('      Date          : ' + e.created_at);
      console.log('      Director ID   : ' + (e.director_id || 'N/A'));
      console.log('');
    });
  }
} catch (e) {
  console.log('ERREUR: ' + e.message);
}
console.log('');

// ============================================================
// 4. Derniers enrollments (toutes statuts)
// ============================================================
console.log('=== 10 DERNIERS ENROLLMENTS (tous statuts) ===');
try {
  const recent = db.prepare(`
    SELECT 
      e.id,
      e.status,
      e.payment_status,
      e.created_at,
      u.full_name as learner_name,
      f.title as formation_title
    FROM enrollments e
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN formations f ON f.id = e.formation_id
    ORDER BY e.created_at DESC
    LIMIT 10
  `).all();

  if (recent.length === 0) {
    console.log('  Aucun enrollment');
  } else {
    recent.forEach((e, i) => {
      console.log('  [' + (i+1) + '] ' + (e.learner_name || 'N/A') + ' -> ' + (e.formation_title || 'N/A'));
      console.log('      status=' + e.status + ' | payment=' + (e.payment_status || 'N/A') + ' | ' + e.created_at);
    });
  }
} catch (e) {
  console.log('ERREUR: ' + e.message);
}
console.log('');

// ============================================================
// 5. Table formations
// ============================================================
console.log('=== FORMATIONS DISPONIBLES ===');
try {
  const formations = db.prepare(`
    SELECT f.id, f.title, f.price, f.director_id, u.full_name as director_name
    FROM formations f
    LEFT JOIN users u ON u.id = f.director_id
    LIMIT 20
  `).all();

  if (formations.length === 0) {
    console.log('  Aucune formation');
  } else {
    formations.forEach((f, i) => {
      console.log('  [' + (i+1) + '] ' + f.title + ' | Prix: ' + (f.price || 'N/A') + ' | Directeur: ' + (f.director_name || 'N/A'));
    });
  }
} catch (e) {
  console.log('ERREUR: ' + e.message);
}
console.log('');

// ============================================================
// 6. Notifications en attente
// ============================================================
console.log('=== NOTIFICATIONS RECENTES ===');
try {
  const notifs = db.prepare(`
    SELECT n.id, n.user_id, n.title, n.type, n.is_read, n.created_at, u.full_name as user_name
    FROM notifications n
    LEFT JOIN users u ON u.id = n.user_id
    ORDER BY n.created_at DESC
    LIMIT 10
  `).all();

  if (notifs.length === 0) {
    console.log('  Aucune notification');
  } else {
    notifs.forEach((n, i) => {
      console.log('  [' + (i+1) + '] ' + n.title);
      console.log('      Pour: ' + (n.user_name || 'N/A') + ' | type=' + n.type + ' | lue=' + n.is_read);
      console.log('      ' + n.created_at);
    });
  }
} catch (e) {
  console.log('ERREUR: ' + e.message);
}

db.close();
console.log('');
console.log('=== FIN ===');