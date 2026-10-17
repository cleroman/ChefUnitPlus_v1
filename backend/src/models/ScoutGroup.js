// ChefUnitPlus - Modele ScoutGroup
const db = require('../config/database');

const ScoutGroup = {
  async findById(id) {
    return await db.prepare(`
      SELECT g.*, u.full_name as director_name,
        (SELECT COUNT(*) FROM users WHERE group_id = g.id) as members_count
      FROM scout_groups g
      LEFT JOIN users u ON g.director_id = u.id
      WHERE g.id = ?
    `).get(id);
  },

  async listAll() {
    return await db.prepare(`
      SELECT g.*, u.full_name as director_name,
        (SELECT COUNT(*) FROM users WHERE group_id = g.id) as members_count
      FROM scout_groups g
      LEFT JOIN users u ON g.director_id = u.id
      ORDER BY g.created_at DESC
    `).all();
  },

  async create({ id, name, region, district, description, createdBy }) {
    db.prepare(`
      INSERT INTO scout_groups (id, name, region, district, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, region, district, description, createdBy);
    return this.findById(id);
  },

  async update(id, fields) {
    const allowed = ['name', 'region', 'district', 'description', 'is_active'];
    const updates = [];
    const values = [];
    Object.entries(fields).forEach(([k, v]) => {
      if (allowed.includes(k) && v !== undefined) {
        updates.push(k + ' = ?');
        values.push(v);
      }
    });
    if (updates.length === 0) return this.findById(id);
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE scout_groups SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  async assignDirector(id, directorId) {
    await db.prepare('UPDATE scout_groups SET director_id = ? WHERE id = ?').run(directorId, id);
    return this.findById(id);
  },

  async delete(id) {
    await db.prepare('DELETE FROM scout_groups WHERE id = ?').run(id);
  },

  async count() {
    return await db.prepare('SELECT COUNT(*) as c FROM scout_groups').get().c;
  }
};

module.exports = ScoutGroup;