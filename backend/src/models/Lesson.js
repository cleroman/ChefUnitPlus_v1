// ChefUnitPlus - Modele Lesson
const db = require('../config/database');

const Lesson = {
  async findById(id) {
    return await db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  },

  async listByModule(moduleId) {
    return await db.prepare(
      'SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index ASC'
    ).all(moduleId);
  },

  async create({ id, moduleId, title, content, type, videoUrl, duration, orderIndex, isPreview }) {
    db.prepare(
      'INSERT INTO lessons (id, module_id, title, content, type, video_url, duration, order_index, is_preview) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, moduleId, title, content, type, videoUrl, duration, orderIndex, isPreview ? 1 : 0);
    return this.findById(id);
  },

  async delete(id) {
    await db.prepare('DELETE FROM lessons WHERE id = ?').run(id);
  }
};

module.exports = Lesson;