const db = require('../config/database');

const Module = {
  async findById(id) {
    return await db.prepare(`
      SELECT m.*,
        u.full_name as trainer_name,
        c.full_name as created_by_name,
        a.full_name as approved_by_name,
        f.title as formation_title
      FROM modules m
      LEFT JOIN users u ON m.trainer_id = u.id
      LEFT JOIN users c ON m.created_by = c.id
      LEFT JOIN users a ON m.approved_by = a.id
      LEFT JOIN formations f ON m.formation_id = f.id
      WHERE m.id = ?
    `).get(id);
  },

  // Pour une formation specifique (vue etudiant/directeur)
  async listByFormation(formationId, { onlyApproved = false } = {}) {
    const statusWhere = onlyApproved ? "AND m.status = 'approved'" : '';
    return await db.prepare(`
      SELECT m.*,
        u.full_name as trainer_name,
        c.full_name as created_by_name,
        (SELECT COUNT(*) FROM lessons WHERE module_id = m.id) as lesson_count
      FROM modules m
      LEFT JOIN users u ON m.trainer_id = u.id
      LEFT JOIN users c ON m.created_by = c.id
      WHERE m.formation_id = ? ${statusWhere}
      ORDER BY m.order_index ASC
    `).all(formationId);
  },

  // Pour le formateur : ses modules (crees ou enseignes)
  async listByTrainer(trainerId) {
    return await db.prepare(`
      SELECT m.*, f.title as formation_title,
        (SELECT COUNT(*) FROM lessons WHERE module_id = m.id) as lesson_count
      FROM modules m
      LEFT JOIN formations f ON m.formation_id = f.id
      WHERE m.trainer_id = ? OR m.created_by = ?
      ORDER BY m.created_at DESC
    `).all(trainerId, trainerId);
  },

  // Pour le directeur : modules en attente de validation
  async listPending() {
    return await db.prepare(`
      SELECT m.*,
        c.full_name as created_by_name,
        c.email as created_by_email,
        f.title as formation_title
      FROM modules m
      LEFT JOIN users c ON m.created_by = c.id
      LEFT JOIN formations f ON m.formation_id = f.id
      WHERE m.status = 'pending'
      ORDER BY m.created_at DESC
    `).all();
  },

  // Pour le directeur : tous les modules
  async listAll() {
    return await db.prepare(`
      SELECT m.*,
        f.title as formation_title,
        u.full_name as trainer_name,
        c.full_name as created_by_name
      FROM modules m
      LEFT JOIN formations f ON m.formation_id = f.id
      LEFT JOIN users u ON m.trainer_id = u.id
      LEFT JOIN users c ON m.created_by = c.id
      ORDER BY m.created_at DESC
    `).all();
  },

  async create({
    id, formationId, title, description,
    trainerId, orderIndex, hours, startDate, endDate,
    pdfPath, createdBy, status = 'pending'
  }) {
    db.prepare(`
      INSERT INTO modules (
        id, formation_id, title, description, trainer_id,
        order_index, hours, start_date, end_date, pdf_path,
        status, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id, formationId, title || '', description || null, trainerId || null,
      orderIndex || 0, hours || 0, startDate || null, endDate || null,
      pdfPath || null, status, createdBy || null
    );
    return this.findById(id);
  },

  async update(id, fields) {
    const allowed = [
      'title', 'description', 'trainer_id', 'order_index',
      'hours', 'start_date', 'end_date', 'pdf_path',
      'status', 'approved_by', 'approved_at', 'director_comment',
      'formation_id'
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
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE modules SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  async approve(id, { hours, startDate, endDate, trainerId, formationId, approvedBy }) {
    db.prepare(`
      UPDATE modules
      SET status = 'approved',
          hours = ?,
          start_date = ?,
          end_date = ?,
          trainer_id = COALESCE(?, trainer_id),
          formation_id = COALESCE(?, formation_id),
          approved_by = ?,
          approved_at = datetime('now'),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      hours || 0, startDate || null, endDate || null,
      trainerId || null, formationId || null, approvedBy, id
    );
    return this.findById(id);
  },

  async reject(id, { comment, approvedBy }) {
    db.prepare(`
      UPDATE modules
      SET status = 'rejected',
          director_comment = ?,
          approved_by = ?,
          approved_at = datetime('now'),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(comment || null, approvedBy, id);
    return this.findById(id);
  },

  async delete(id) {
    await db.prepare('DELETE FROM modules WHERE id = ?').run(id);
  },
};

module.exports = Module;