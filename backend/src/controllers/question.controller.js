// =============================================================
// ChefUnitPlus - Question Controller
// Gere les questions au formateur
// =============================================================
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// ============================================================
// CREATE : poser une question
// ============================================================
exports.create = async (req, res) => {
  try {
    const { formation_id, module_id, trainer_id, title, content, priority } = req.body;
    const userId = req.user.id;

    if (!formation_id || !title || !content) {
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO questions (
        id, user_id, formation_id, module_id, trainer_id,
        title, content, status, priority, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `).run(id, userId, formation_id, module_id || null, trainer_id || null,
           title.trim(), content.trim(), priority || 'normal', now, now);

    const row = await db.prepare(`
      SELECT q.*, u.full_name as user_name
      FROM questions q
      LEFT JOIN users u ON u.id = q.user_id
      WHERE q.id = ?
    `).get(id);

    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// LIST : mes questions (apprenant)
// ============================================================
exports.listMy = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await db.prepare(`
      SELECT q.*,
        (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) as answer_count
      FROM questions q
      WHERE q.user_id = ?
      ORDER BY q.created_at DESC
    `).all(userId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// LIST : questions d'une formation (formateur/directeur)
// ============================================================
exports.listByFormation = async (req, res) => {
  try {
    const { formation_id } = req.params;
    const rows = await db.prepare(`
      SELECT q.*, u.full_name as user_name, u.email as user_email,
        (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) as answer_count
      FROM questions q
      LEFT JOIN users u ON u.id = q.user_id
      WHERE q.formation_id = ?
      ORDER BY
        CASE q.priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
        q.created_at DESC
    `).all(formation_id);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GET BY ID : question + reponses
// ============================================================
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await db.prepare(`
      SELECT q.*, u.full_name as user_name, u.email as user_email
      FROM questions q
      LEFT JOIN users u ON u.id = q.user_id
      WHERE q.id = ?
    `).get(id);

    if (!question) return res.status(404).json({ success: false, message: 'Question introuvable' });

    const answers = await db.prepare(`
      SELECT a.*, u.full_name as user_name, u.role as user_role
      FROM answers a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.question_id = ?
      ORDER BY a.created_at ASC
    `).all(id);

    return res.json({ success: true, data: { question, answers } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// ANSWER : repondre a une question
// ============================================================
exports.answer = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Reponse trop courte' });
    }

    const id2 = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO answers (id, question_id, user_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id2, id, userId, content.trim(), now, now);

    // Si le formateur repond, marquer la question comme "answered"
    if (req.user.role === 'formateur' || req.user.role === 'directeur' || req.user.role === 'admin') {
      db.prepare('UPDATE questions SET status = ?, updated_at = ? WHERE id = ?')
        .run('answered', now, id);
    }

    const row = await db.prepare(`
      SELECT a.*, u.full_name as user_name, u.role as user_role
      FROM answers a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.id = ?
    `).get(id2);

    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// CLOSE : fermer une question
// ============================================================
exports.close = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    db.prepare('UPDATE questions SET status = ?, updated_at = ? WHERE id = ?')
      .run('closed', now, id);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = exports;