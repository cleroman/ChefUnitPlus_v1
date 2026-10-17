// ChefUnitPlus - Modele Payment
const db = require('../config/database');

const Payment = {
  async findById(id) {
    return await db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  },

  async findByOrderNumber(orderNumber) {
    return await db.prepare('SELECT * FROM payments WHERE order_number = ?').get(orderNumber);
  },

  async create({ id, enrollmentId, orderNumber, amount, currency, status }) {
    db.prepare(
      'INSERT INTO payments (id, enrollment_id, order_number, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, enrollmentId, orderNumber, amount, currency, status);
    return this.findById(id);
  },

  async updateStatus(orderNumber, status) {
    await db.prepare('UPDATE payments SET status = ? WHERE order_number = ?').run(status, orderNumber);
    return this.findByOrderNumber(orderNumber);
  },

  async listRecent(limit = 50) {
    return await db.prepare(
      'SELECT p.*, e.learner_id, u.full_name as learner_name, e.formation_title FROM payments p LEFT JOIN enrollments e ON p.enrollment_id = e.id LEFT JOIN users u ON e.learner_id = u.id ORDER BY p.created_at DESC LIMIT ?'
    ).all(limit);
  }
};

module.exports = Payment;