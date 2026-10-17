// =============================================================
// ChefUnitPlus - Stats Controller
// Fournit toutes les statistiques pour les dashboards
// Chaque statistique est tracee a sa source (table SQL)
// =============================================================

const db = require('../config/database');

// ============================================================
// HELPERS
// ============================================================

/**
 * Execute une requete COUNT et retourne le resultat
 * @param {string} sql - Requete SQL
 * @param {Array} params - Parametres
 * @returns {Promise<number>}
 */
async function count(sql, params = []) {
  try {
    const row = await db.queryOne(sql, params);
    return row ? (row.count || row.total || Object.values(row)[0] || 0) : 0;
  } catch (e) {
    console.error('[Stats] count error:', e.message, sql);
    return 0;
  }
}

/**
 * Execute une requete SUM et retourne le resultat
 */
async function sum(sql, params = []) {
  try {
    const row = await db.queryOne(sql, params);
    return row ? (row.total || Object.values(row)[0] || 0) : 0;
  } catch (e) {
    console.error('[Stats] sum error:', e.message, sql);
    return 0;
  }
}

// ============================================================
// STATS ADMIN
// Source : tables users, formations, enrollments, payments
// ============================================================

exports.getAdminStats = async (req, res) => {
  try {
    const stats = {
      // Utilisateurs
      users: {
        total: await count('SELECT COUNT(*) as count FROM users'),
        actifs: await count(`SELECT COUNT(*) as count FROM users WHERE is_active = '1'`),
        en_attente: await count(`SELECT COUNT(*) as count FROM users WHERE is_active = '0'`),
        apprenants: await count("SELECT COUNT(*) as count FROM users WHERE role = 'apprenant'"),
        formateurs: await count("SELECT COUNT(*) as count FROM users WHERE role = 'formateur'"),
        directeurs: await count("SELECT COUNT(*) as count FROM users WHERE role = 'directeur'"),
        admins: await count("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"),
        source: 'table users'
      },
      // Formations
      formations: {
        total: await count('SELECT COUNT(*) as count FROM formations'),
        publiees: await count(`SELECT COUNT(*) as count FROM formations WHERE is_published = '1'`),
        brouillons: await count(`SELECT COUNT(*) as count FROM formations WHERE is_published = '0'`),
        source: 'table formations'
      },
      // Inscriptions
      enrollments: {
        total: await count('SELECT COUNT(*) as count FROM enrollments'),
        en_attente: await count("SELECT COUNT(*) as count FROM enrollments WHERE status = 'pending'"),
        validees: await count("SELECT COUNT(*) as count FROM enrollments WHERE status = 'validated'"),
        rejetees: await count("SELECT COUNT(*) as count FROM enrollments WHERE status = 'rejected'"),
        source: 'table enrollments'
      },
      // Paiements
      payments: {
        total: await count('SELECT COUNT(*) as count FROM payment_requests'),
        en_attente: await count("SELECT COUNT(*) as count FROM payment_requests WHERE status = 'pending'"),
        valides: await count("SELECT COUNT(*) as count FROM payment_requests WHERE status = 'validated'"),
        rejetes: await count("SELECT COUNT(*) as count FROM payment_requests WHERE status = 'rejected'"),
        montant_total: await sum("SELECT SUM(amount) as total FROM payment_requests WHERE status = 'validated'"),
        source: 'table payment_requests'
      },
      // Modules
      modules: {
        total: await count('SELECT COUNT(*) as count FROM modules'),
        approuves: await count("SELECT COUNT(*) as count FROM modules WHERE status = 'approved'"),
        en_attente: await count("SELECT COUNT(*) as count FROM modules WHERE status = 'pending'"),
        source: 'table modules'
      },
      // Questions
      questions: {
        total: await count('SELECT COUNT(*) as count FROM questions'),
        ouvertes: await count("SELECT COUNT(*) as count FROM questions WHERE status = 'open'"),
        repondues: await count("SELECT COUNT(*) as count FROM questions WHERE status = 'answered'"),
        source: 'table questions'
      },
      // Presences
      attendances: {
        total: await count('SELECT COUNT(*) as count FROM attendances'),
        aujourdhui: await count("SELECT COUNT(*) as count FROM attendances WHERE DATE(session_date) = DATE('now')"),
        source: 'table attendances'
      },
      // Revenus
      revenue: {
        total: await sum("SELECT SUM(amount) as total FROM payment_requests WHERE status = 'validated'"),
        ce_mois: await sum("SELECT SUM(amount) as total FROM payment_requests WHERE status = 'validated' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"),
        source: 'table payment_requests'
      }
    };

    res.json({ success: true, data: stats });
  } catch (e) {
    console.error('[Stats] getAdminStats error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ============================================================
// STATS APPRENANT
// Source : tables enrollments, attendances, questions
// ============================================================

exports.getLearnerStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = {
      formations: {
        total: await count('SELECT COUNT(*) as count FROM enrollments WHERE user_id = ?', [userId]),
        en_cours: await count("SELECT COUNT(*) as count FROM enrollments WHERE user_id = ? AND status = 'validated'", [userId]),
        terminees: await count("SELECT COUNT(*) as count FROM enrollments WHERE user_id = ? AND status = 'completed'", [userId]),
        source: 'table enrollments'
      },
      presences: {
        total: await count('SELECT COUNT(*) as count FROM attendances WHERE user_id = ?', [userId]),
        ce_mois: await count("SELECT COUNT(*) as count FROM attendances WHERE user_id = ? AND strftime('%Y-%m', session_date) = strftime('%Y-%m', 'now')", [userId]),
        source: 'table attendances'
      },
      questions: {
        total: await count('SELECT COUNT(*) as count FROM questions WHERE user_id = ?', [userId]),
        repondues: await count("SELECT COUNT(*) as count FROM questions WHERE user_id = ? AND status = 'answered'", [userId]),
        source: 'table questions'
      },
      paiements: {
        total: await count('SELECT COUNT(*) as count FROM payment_requests WHERE user_id = ?', [userId]),
        valides: await count("SELECT COUNT(*) as count FROM payment_requests WHERE user_id = ? AND status = 'validated'", [userId]),
        source: 'table payment_requests'
      }
    };

    res.json({ success: true, data: stats });
  } catch (e) {
    console.error('[Stats] getLearnerStats error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ============================================================
// STATS FORMATEUR
// Source : tables modules, formations, questions
// ============================================================

exports.getTrainerStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = {
      modules: {
        total: await count('SELECT COUNT(*) as count FROM modules WHERE trainer_id = ?', [userId]),
        approuves: await count("SELECT COUNT(*) as count FROM modules WHERE trainer_id = ? AND status = 'approved'", [userId]),
        en_attente: await count("SELECT COUNT(*) as count FROM modules WHERE trainer_id = ? AND status = 'pending'", [userId]),
        source: 'table modules'
      },
      formations: {
        total: await count('SELECT COUNT(DISTINCT formation_id) as count FROM modules WHERE trainer_id = ?', [userId]),
        source: 'table modules'
      },
      questions: {
        total: await count('SELECT COUNT(*) as count FROM questions WHERE formation_id IN (SELECT DISTINCT formation_id FROM modules WHERE trainer_id = ?)', [userId]),
        en_attente: await count("SELECT COUNT(*) as count FROM questions WHERE formation_id IN (SELECT DISTINCT formation_id FROM modules WHERE trainer_id = ?) AND status = 'open'", [userId]),
        source: 'table questions'
      },
      apprenants: {
        total: await count('SELECT COUNT(DISTINCT e.user_id) as count FROM enrollments e JOIN modules m ON e.formation_id = m.formation_id WHERE m.trainer_id = ?', [userId]),
        source: 'table enrollments + modules'
      }
    };

    res.json({ success: true, data: stats });
  } catch (e) {
    console.error('[Stats] getTrainerStats error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ============================================================
// STATS FORMATION (detail)
// Source : tables enrollments, attendances, questions
// ============================================================

exports.getFormationStats = async (req, res) => {
  try {
    const { formationId } = req.params;

    const stats = {
      formation_id: formationId,
      apprenants: {
        total: await count('SELECT COUNT(*) as count FROM enrollments WHERE formation_id = ?', [formationId]),
        valides: await count("SELECT COUNT(*) as count FROM enrollments WHERE formation_id = ? AND status = 'validated'", [formationId]),
        en_attente: await count("SELECT COUNT(*) as count FROM enrollments WHERE formation_id = ? AND status = 'pending'", [formationId]),
        source: 'table enrollments'
      },
      presences: {
        total: await count('SELECT COUNT(*) as count FROM attendances WHERE formation_id = ?', [formationId]),
        moyenne: await count('SELECT AVG(cnt) as count FROM (SELECT COUNT(*) as cnt FROM attendances WHERE formation_id = ? GROUP BY user_id)', [formationId]),
        source: 'table attendances'
      },
      questions: {
        total: await count('SELECT COUNT(*) as count FROM questions WHERE formation_id = ?', [formationId]),
        repondues: await count("SELECT COUNT(*) as count FROM questions WHERE formation_id = ? AND status = 'answered'", [formationId]),
        source: 'table questions'
      },
      modules: {
        total: await count('SELECT COUNT(*) as count FROM modules WHERE formation_id = ?', [formationId]),
        approuves: await count("SELECT COUNT(*) as count FROM modules WHERE formation_id = ? AND status = 'approved'", [formationId]),
        source: 'table modules'
      }
    };

    res.json({ success: true, data: stats });
  } catch (e) {
    console.error('[Stats] getFormationStats error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ============================================================
// STATS GLOBALES (pour global_stats_screen)
// ============================================================

exports.getGlobalStats = async (req, res) => {
  try {
    const stats = {
      users: await count('SELECT COUNT(*) as count FROM users'),
      formations: await count('SELECT COUNT(*) as count FROM formations'),
      enrollments: await count('SELECT COUNT(*) as count FROM enrollments'),
      modules: await count('SELECT COUNT(*) as count FROM modules'),
      questions: await count('SELECT COUNT(*) as count FROM questions'),
      attendances: await count('SELECT COUNT(*) as count FROM attendances'),
      revenue: await sum("SELECT SUM(amount) as total FROM payment_requests WHERE status = 'validated'"),
      source: 'toutes les tables'
    };

    res.json({ success: true, data: stats });
  } catch (e) {
    console.error('[Stats] getGlobalStats error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
};