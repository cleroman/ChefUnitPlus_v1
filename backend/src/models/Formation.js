const db = require('../config/database');

const Formation = {
  async findById(id) {
    return await db.prepare(`
      SELECT f.*, u.full_name as trainer_name, d.full_name as director_name,
        (SELECT COUNT(*) FROM enrollments WHERE formation_id = f.id AND status = 'approved') as enrolled_count
      FROM formations f
      LEFT JOIN users u ON f.trainer_id = u.id
      LEFT JOIN users d ON f.director_id = d.id
      WHERE f.id = ?
    `).get(id);
  },

  async listAll({ includeUnpublished = false } = {}) {
    const where = includeUnpublished ? '' : "WHERE f.is_published = '1'";
    return await db.prepare(`
      SELECT f.*, u.full_name as trainer_name, d.full_name as director_name,
        (SELECT COUNT(*) FROM enrollments WHERE formation_id = f.id AND status = 'approved') as enrolled_count,
        (SELECT COUNT(*) FROM modules WHERE formation_id = f.id) as module_count
      FROM formations f
      LEFT JOIN users u ON f.trainer_id = u.id
      LEFT JOIN users d ON f.director_id = d.id
      ${where}
      ORDER BY f.created_at DESC
    `).all();
  },

  async create({
    id, title, description, price, currency, type,
    startDate, endDate, trainerId, directorId,
    pdfPath, ficheTechniquePath, maxParticipants
  }) {
    db.prepare(`
      INSERT INTO formations (
        id, title, description, price, currency, type,
        start_date, end_date, total_hours, trainer_id, director_id,
        pdf_path, fiche_technique_path, max_participants, is_published, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(
      id, title, description || '', price || 0, currency || 'USD',
      type || 'training', startDate || null, endDate || null,
      trainerId || null, directorId, pdfPath || null, ficheTechniquePath || null,
      maxParticipants || 0
    );
    return this.findById(id);
  },

  async update(id, fields) {
    const allowed = [
      'title', 'description', 'price', 'currency', 'type',
      'start_date', 'end_date', 'trainer_id',
      'pdf_path', 'fiche_technique_path', 'max_participants',
      'is_published', 'total_hours'
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
    db.prepare(`UPDATE formations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  async recalculateHours(formationId) {
    const r = await db.prepare(
      'SELECT COALESCE(SUM(hours), 0) as total FROM modules WHERE formation_id = ?'
    ).get(formationId);
    await db.prepare('UPDATE formations SET total_hours = ? WHERE id = ?').run(r.total, formationId);
    return r.total;
  },

  async delete(id) {
    await db.prepare('DELETE FROM formations WHERE id = ?').run(id);
  },
};

module.exports = Formation;