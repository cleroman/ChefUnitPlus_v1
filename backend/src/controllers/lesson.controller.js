const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

exports.listByModule = async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index ASC').all(req.params.moduleId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const row = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Lecon introuvable' });
    return res.json({ success: true, data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { module_id, title, content, type, video_url, pdf_url, audio_url, duration, order_index, is_preview } = req.body;
    if (!module_id || !title) return res.status(400).json({ success: false, message: 'module_id et title requis' });

    const module = await db.prepare('SELECT id FROM modules WHERE id = ?').get(module_id);
    if (!module) return res.status(404).json({ success: false, message: 'Module introuvable' });

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO lessons (id, module_id, title, content, type, video_url, pdf_url, audio_url, duration, order_index, is_preview, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, module_id, title, content || null, type || 'text', video_url || null, pdf_url || null, audio_url || null, duration || 0, order_index || 0, is_preview ? 1 : 0, now, now);

    return res.status(201).json({ success: true, data: await db.prepare('SELECT * FROM lessons WHERE id = ?').get(id) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Lecon introuvable' });

    const fields = ['title', 'content', 'type', 'video_url', 'pdf_url', 'audio_url', 'duration', 'order_index', 'is_preview'];
    const updates = [];
    const params = [];

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(f + ' = ?');
        params.push(f === 'is_preview' ? (req.body[f] ? 1 : 0) : req.body[f]);
      }
    });

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(req.params.id);

    db.prepare(`UPDATE lessons SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return res.json({ success: true, data: await db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.prepare('DELETE FROM lessons WHERE id = ?').run(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = exports;