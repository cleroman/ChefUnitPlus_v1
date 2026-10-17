// =============================================================
// ChefUnitPlus - Modele User (etendu Scout)
// =============================================================

const db = require('../config/database');

const User = {
  async findById(id) {
    return await db.prepare(`
      SELECT id, full_name, post_nom, prenom, email, phone, sexe,
             date_naissance, lieu_naissance, photo_url,
             role, is_active, created_at
      FROM users WHERE id = ?
    `).get(id);
  },

  async findByEmail(email) {
    return await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  async create(data) {
    const {
      id, fullName, postNom, prenom, email, phone,
      sexe, dateNaissance, lieuNaissance,
      passwordHash, role = 'apprenant'
    } = data;

    db.prepare(`
      INSERT INTO users (
        id, full_name, post_nom, prenom, email, phone,
        sexe, date_naissance, lieu_naissance,
        password_hash, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, fullName, postNom || null, prenom || null, email, phone,
      sexe || null, dateNaissance || null, lieuNaissance || null,
      passwordHash, role
    );

    return this.findById(id);
  },

  async updateProfile(id, fields) {
    const allowed = [
      'full_name', 'post_nom', 'prenom', 'phone', 'sexe',
      'date_naissance', 'lieu_naissance', 'photo_url', 'avatar_url'
    ];
    const updates = [];
    const values = [];

    Object.entries(fields).forEach(([k, v]) => {
      if (allowed.includes(k) && v !== undefined) {
        updates.push(k + ' = ?');
        values.push(v);
      }
    });

    if (updates.length === 0) return this.findById(id);
    values.push(id);
    db.prepare('UPDATE users SET ' + updates.join(', ') + ' WHERE id = ?').run(...values);
    return this.findById(id);
  },

  async updateRole(id, role) {
    await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    return this.findById(id);
  },

  async toggleActive(id, isActive) {
    await db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
    return this.findById(id);
  },

  async listAll({ role = null } = {}) {
    if(role) {
      return await db.prepare(
        'SELECT id, full_name, post_nom, prenom, email, phone, sexe, role, is_active, created_at FROM users WHERE role = ? ORDER BY created_at DESC'
      ).all(role);
    }
    return await db.prepare(
      'SELECT id, full_name, post_nom, prenom, email, phone, sexe, role, is_active, created_at FROM users ORDER BY created_at DESC'
    ).all();
  },

  async delete(id) {
    await db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },
};

module.exports = User;
