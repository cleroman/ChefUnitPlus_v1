// =============================================================
// ChefUnitPlus - Notification Controller
// Gestion des notifications
// =============================================================

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// ============================================================
// LISTER MES NOTIFICATIONS
// ============================================================
exports.listMy = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const notifications = await db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);

    const unreadCount = await db.prepare(`
      SELECT COUNT(*) as c FROM notifications
      WHERE user_id = ? AND is_read = '0'
    `).get(userId).c;

    return res.json({
      success: true,
      data: notifications,
      unread_count: unreadCount,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// MARQUER COMME LUE
// ============================================================
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await db.prepare(`
      UPDATE notifications
      SET is_read = '1'
      WHERE id = ? AND user_id = ?
    `).run(id, userId);

    return res.json({ success: true, message: 'Notification marquee comme lue' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// MARQUER TOUTES COMME LUES
// ============================================================
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.prepare(`
      UPDATE notifications
      SET is_read = '1'
      WHERE user_id = ? AND is_read = '0'
    `).run(userId);

    return res.json({ success: true, message: 'Toutes les notifications marquees comme lues' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// CREER UNE NOTIFICATION (helper)
// ============================================================
exports.createNotification = async (userId, title, message, type = 'info', link = null) => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, userId, title, message, type, link, now);

    return id;
  } catch (err) {
    console.error('[createNotification] error:', err);
    return null;
  }
};

// ============================================================
// SUPPRIMER UNE NOTIFICATION
// ============================================================
exports.remove = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(id, userId);

    return res.json({ success: true, message: 'Notification supprimee' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};