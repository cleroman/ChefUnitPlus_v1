// ChefUnitPlus - Modele ScoutCamp
const db = require('../config/database');

const ScoutCamp = {
  async listByUser(userId) {
    return await db.prepare('SELECT * FROM scout_camps WHERE user_id = ? ORDER BY annee DESC').all(userId);
  },

  async create({ id, userId, nomCamp, annee, lieu, description }) {
    db.prepare(
      'INSERT INTO scout_camps (id, user_id, nom_camp, annee, lieu, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, userId, nomCamp, annee || null, lieu || null, description || null);
    return await db.prepare('SELECT * FROM scout_camps WHERE id = ?').get(id);
  },

  async deleteByUser(userId) {
    await db.prepare('DELETE FROM scout_camps WHERE user_id = ?').run(userId);
  },
};

module.exports = ScoutCamp;
