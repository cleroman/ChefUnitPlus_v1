// ChefUnitPlus - Modele Complaint (plainte)
const db = require('../config/database');

const Complaint = {
  async findById(id) {
    return await db.prepare(`
      SELECT c.*, u.full_name as user_name, u.email as user_email,
        a.full_name as responder_name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users a ON c.responded_by = a.id
      WHERE c.id = ?
    `).get(id);
  },

  async listAll({ status = null } = {}) {
    if(status) {
      return await db.prepare(`
        SELECT c.*, u.full_name as user_name, u.email as user_email
        FROM complaints c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.status = ?
        ORDER BY
          CASE c.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
          END,
          c.created_at DESC
      `).all(status);
    }

    return await db.prepare(`
      SELECT c.*, u.full_name as user_name, u.email as user_email
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
    `).all();
  },

  async listByUser(userId) {
    return await db.prepare(`
      SELECT * FROM complaints
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
  },

  async create({ id, userId, subject, description, category, priority }) {
    db.prepare(`
      INSERT INTO complaints (id, user_id, subject, description, category, priority)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, subject, description, category, priority || 'normal');
    return this.findById(id);
  },

  async respond(id, { adminResponse, respondedBy, newStatus }) {
    db.prepare(`
      UPDATE complaints
      SET admin_response = ?, responded_by = ?, responded_at = CURRENT_TIMESTAMP,
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(adminResponse, respondedBy, newStatus, id);
    return this.findById(id);
  },

  async close(id) {
    await db.prepare("UPDATE complaints SET status = 'closed' WHERE id = ?").run(id);
    return this.findById(id);
  },

  async countOpen() {
    return await db.prepare(
      "SELECT COUNT(*) as c FROM complaints WHERE status IN ('open', 'in_progress')"
    ).get().c;
  }
};

module.exports = Complaint;