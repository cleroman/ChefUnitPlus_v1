// ChefUnitPlus - Modele Enrollment
const db = require('../config/database');

const Enrollment = {
  async findById(id) {
    return await db.prepare(
      'SELECT e.*, f.title as formation_title, u.full_name as learner_name FROM enrollments e LEFT JOIN formations f ON e.formation_id = f.id LEFT JOIN users u ON e.learner_id = u.id WHERE e.id = ?'
    ).get(id);
  },

  async listByLearner(learnerId) {
    return await db.prepare(
      'SELECT e.*, f.title as formation_title FROM enrollments e LEFT JOIN formations f ON e.formation_id = f.id WHERE e.learner_id = ? ORDER BY e.requested_at DESC'
    ).all(learnerId);
  },

  async listPending() {
    return await db.prepare(
      "SELECT e.*, f.title as formation_title, u.full_name as learner_name FROM enrollments e LEFT JOIN formations f ON e.formation_id = f.id LEFT JOIN users u ON e.learner_id = u.id WHERE e.status = 'pendingDirector' ORDER BY e.requested_at DESC"
    ).all();
  },

  async create({ id, learnerId, formationId, formationTitle, amountPaid = 0, status = 'pendingPayment' }) {
    db.prepare(
      'INSERT INTO enrollments (id, learner_id, formation_id, formation_title, amount_paid, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, learnerId, formationId, formationTitle, amountPaid, status);
    return this.findById(id);
  },

  async updateStatus(id, status, options = {}) {
    const updates = ['status = ?'];
    const values = [status];
    if(options.comment != null) { updates.push('director_comment = ?'); values.push(options.comment); }
    if(options.paymentRef != null) { updates.push('payment_ref = ?'); values.push(options.paymentRef); }
    if(options.amountPaid != null) { updates.push('amount_paid = ?'); values.push(options.amountPaid); }
    if (status === 'approved' || status === 'rejected') updates.push('validated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare('UPDATE enrollments SET ' + updates.join(', ') + ' WHERE id = ?').run(...values);
    return this.findById(id);
  }
};

module.exports = Enrollment;