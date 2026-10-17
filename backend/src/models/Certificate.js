// ChefUnitPlus - Modele Certificate
const db = require('../config/database');

const Certificate = {
  async findById(id) {
    return await db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
  },

  async listByUser(userId) {
    return await db.prepare(
      'SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_at DESC'
    ).all(userId);
  },

  async create({ id, userId, formationId, certificateNumber, pdfUrl }) {
    db.prepare(
      'INSERT INTO certificates (id, user_id, formation_id, certificate_number, pdf_url) VALUES (?, ?, ?, ?, ?)'
    ).run(id, userId, formationId, certificateNumber, pdfUrl);
    return this.findById(id);
  }
};

module.exports = Certificate;