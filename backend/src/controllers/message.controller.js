// =============================================================
// ChefUnitPlus - MessageController
// Gestion des messages entre utilisateurs
// =============================================================

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// LISTER MES MESSAGES
// GET /api/messages/my
// ============================================================
exports.myMessages = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role;

    const query = `
      SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.subject,
        m.content,
        m.type,
        m.is_read,
        m.created_at,
        u.full_name as sender_name,
        u.role as sender_role,
        u.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.receiver_id = ?
      ORDER BY m.created_at DESC
      LIMIT 100
    `;

    const messages = await db.prepare(query).all(userId);

    // Compter non lus
    const unreadCount = messages.filter(m => m.is_read === 0).length;

    res.json({
      success: true,
      data: messages,
      unread_count: unreadCount,
      count: messages.length
    });
  } catch (error) {
    console.error('[messages.myMessages] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// MESSAGES ENVOYES
// GET /api/messages/sent
// ============================================================
exports.sentMessages = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    const query = `
      SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.subject,
        m.content,
        m.type,
        m.is_read,
        m.created_at,
        u.full_name as receiver_name,
        u.role as receiver_role
      FROM messages m
      LEFT JOIN users u ON u.id = m.receiver_id
      WHERE m.sender_id = ?
      ORDER BY m.created_at DESC
      LIMIT 100
    `;

    const messages = await db.prepare(query).all(userId);

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('[messages.sentMessages] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// ENVOYER UN MESSAGE
// POST /api/messages
// ============================================================
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user?.userId || req.user?.id;
    const { receiver_id, subject, content, type } = req.body;

    if (!receiver_id || !content) {
      return res.status(400).json({
        success: false,
        message: 'receiver_id et content sont requis'
      });
    }

    // Verifier que le destinataire existe
    const receiver = await db.prepare('SELECT id, full_name FROM users WHERE id = ?').get(receiver_id);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Destinataire introuvable' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO messages (id, sender_id, receiver_id, subject, content, type, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, senderId, receiver_id, subject || null, content, type || 'text', now);

    // Notification au destinataire
    try {
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, 'Nouveau message', ?, 'message', 0, '/messages', ?)
      `).run(
        uuidv4(),
        receiver_id,
        'Vous avez un nouveau message',
        now
      );
    } catch (e) { console.error('[messages.send] notif error:', e); }

    res.status(201).json({
      success: true,
      message: 'Message envoye',
      data: {
        id,
        sender_id: senderId,
        receiver_id,
        subject,
        content,
        type: type || 'text',
        is_read: 0,
        created_at: now
      }
    });
  } catch (error) {
    console.error('[messages.sendMessage] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// MARQUER COMME LU
// PATCH /api/messages/:id/read
// ============================================================
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const message = await db.prepare('SELECT * FROM messages WHERE id = ? AND receiver_id = ?').get(id, userId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message introuvable' });
    }

    await db.prepare(`UPDATE messages SET is_read = '1' WHERE id = ?`).run(id);

    res.json({ success: true, message: 'Message marque comme lu' });
  } catch (error) {
    console.error('[messages.markAsRead] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// MARQUER TOUS COMME LUS
// PATCH /api/messages/read-all
// ============================================================
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    await db.prepare(`UPDATE messages SET is_read = '1' WHERE receiver_id = ?`).run(userId);

    res.json({ success: true, message: 'Tous les messages sont lus' });
  } catch (error) {
    console.error('[messages.markAllAsRead] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// SUPPRIMER UN MESSAGE
// DELETE /api/messages/:id
// ============================================================
exports.deleteMessage = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const message = await db.prepare('SELECT * FROM messages WHERE id = ? AND (receiver_id = ? OR sender_id = ?)').get(id, userId, userId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message introuvable' });
    }

    await db.prepare('DELETE FROM messages WHERE id = ?').run(id);

    res.json({ success: true, message: 'Message supprime' });
  } catch (error) {
    console.error('[messages.deleteMessage] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// LISTE DES CONTACTS (users avec qui discuter)
// GET /api/messages/contacts
// ============================================================
exports.contacts = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role;

    let query = `
      SELECT id, full_name, email, role, avatar_url
      FROM users
      WHERE is_active = '1' AND id != ?
    `;
    const params = [userId];

    // Filtrer selon le role
    if (role === 'apprenant') {
      query += " AND role IN ('directeur', 'formateur', 'admin')";
    } else if (role === 'formateur') {
      query += " AND role IN ('directeur', 'apprenant', 'admin')";
    } else if (role === 'directeur') {
      query += " AND role IN ('formateur', 'apprenant', 'admin')";
    }

    query += ' ORDER BY full_name LIMIT 200';

    const users = await db.prepare(query).all(...params);

    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('[messages.contacts] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};