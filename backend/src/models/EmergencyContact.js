// ChefUnitPlus - Modele EmergencyContact
const db = require('../config/database');

const EmergencyContact = {
  async listByUser(userId) {
    return await db.prepare('SELECT * FROM emergency_contacts WHERE user_id = ?').all(userId);
  },

  async create({ id, userId, nom, postNom, prenom, telephone, adresse, relation }) {
    db.prepare(
      'INSERT INTO emergency_contacts (id, user_id, nom, post_nom, prenom, telephone, adresse, relation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, userId, nom, postNom || null, prenom || null, telephone, adresse || null, relation || null);
    return await db.prepare('SELECT * FROM emergency_contacts WHERE id = ?').get(id);
  },

  async deleteByUser(userId) {
    await db.prepare('DELETE FROM emergency_contacts WHERE user_id = ?').run(userId);
  },
};

module.exports = EmergencyContact;
