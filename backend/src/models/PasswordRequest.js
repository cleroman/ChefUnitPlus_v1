// ChefUnitPlus - Modele PasswordRequest
const db = require('../config/database');

const PasswordRequest = {
  async findById(id) {
    return await db.prepare(`
      SELECT p.*, u.full_name as user_name, u.email as user_email,
        a.full_name as processor_name
      FROM password_requests p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN users a ON p.processed_by = a.id
      WHERE p.id = ?
    `).get(id);
  },

  async listPending() {
    return await db.prepare(`
      SELECT p.*, u.full_name as user_name, u.email as user_email
      FROM password_requests p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
    `).all();
  },

  async listAll() {
    return await db.prepare(`
      SELECT p.*, u.full_name as user_name, u.email as user_email
      FROM password_requests p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all();
  },

  async create({ id, userId, reason }) {
    db.prepare(`
      INSERT INTO password_requests (id, user_id, reason)
      VALUES (?, ?, ?)
    `).run(id, userId, reason);
    return this.findById(id);
  },

  async approve(id, { newPasswordHash, processedBy }) {
    await db.prepare(`
      UPDATE password_requests
      SET status = 'approved', new_password_hash = ?,
          processed_by = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPasswordHash, processedBy, id);
    return this.findById(id);
  },

  async reject(id, { processedBy }) {
    await db.prepare(`
      UPDATE password_requests
      SET status = 'rejected', processed_by = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(processedBy, id);
    return this.findById(id);
  },

  async countPending() {
    return await db.prepare(
      "SELECT COUNT(*) as c FROM password_requests WHERE status = 'pending'"
    ).get().c;
  }
};

module.exports = PasswordRequest;