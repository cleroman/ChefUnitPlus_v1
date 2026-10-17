// =============================================================
// ChefUnitPlus - Attendance Controller
// Gere le pointage de presence
// =============================================================
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// ============================================================
// CHECK-IN : pointer la presence
// ============================================================
exports.checkIn = async (req, res) => {
  try {
    const { formation_id, module_id, session_date, latitude, longitude, notes } = req.body;
    const userId = req.user.id;

    if (!formation_id) return res.status(400).json({ success: false, message: 'Formation requise' });

    const today = session_date || new Date().toISOString().split('T')[0];

    // Verifier si deja pointe aujourd'hui
    const existing = await db.prepare(`
      SELECT * FROM attendance
      WHERE user_id = ? AND formation_id = ? AND session_date = ?
    `).get(userId, formation_id, today);

    if (existing) {
      return res.status(400).json({ success: false, message: 'Presence deja pointee aujourd\'hui' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO attendance (
        id, user_id, formation_id, module_id, session_date,
        check_in_time, status, latitude, longitude, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'present', ?, ?, ?, ?)
    `).run(id, userId, formation_id, module_id || null, today, now,
           latitude || null, longitude || null, notes || null, now);

    const row = await db.prepare('SELECT * FROM attendance WHERE id = ?').get(id);
    return res.status(201).json({ success: true, message: 'Presence pointee', data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// CHECK-OUT
// ============================================================
exports.checkOut = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    await db.prepare('UPDATE attendance SET check_out_time = ? WHERE id = ?').run(now, id);

    const row = await db.prepare('SELECT * FROM attendance WHERE id = ?').get(id);
    return res.json({ success: true, data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// LIST : mes presences (apprenant)
// ============================================================
exports.listMy = async (req, res) => {
  try {
    const userId = req.user.id;
    const { formation_id } = req.query;

    let query = 'SELECT * FROM attendance WHERE user_id = ?';
    const params = [userId];

    if (formation_id) {
      query += ' AND formation_id = ?';
      params.push(formation_id);
    }

    query += ' ORDER BY session_date DESC';

    const rows = await db.prepare(query).all(...params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// LIST : presences d'une formation (formateur/directeur)
// ============================================================
exports.listByFormation = async (req, res) => {
  try {
    const { formation_id } = req.params;
    const rows = await db.prepare(`
      SELECT a.*, u.full_name as user_name, u.email as user_email
      FROM attendance a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.formation_id = ?
      ORDER BY a.session_date DESC
    `).all(formation_id);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// STATS
// ============================================================
exports.getStats = async (req, res) => {
  try {
    const { formation_id } = req.params;
    const userId = req.user.id;

    const total = await db.prepare(`
      SELECT COUNT(*) as c FROM attendance
      WHERE user_id = ? AND formation_id = ?
    `).get(userId, formation_id);

    const present = await db.prepare(`
      SELECT COUNT(*) as c FROM attendance
      WHERE user_id = ? AND formation_id = ? AND status = 'present'
    `).get(userId, formation_id);

    return res.json({
      success: true,
      data: { total: total.c, present: present.c },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = exports;