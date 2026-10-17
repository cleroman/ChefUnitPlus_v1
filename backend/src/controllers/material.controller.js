// =============================================================
// ChefUnitPlus - Material Controller
// Gere les PDF/Videos de formation et modules
// =============================================================
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// ============================================================
// FORMATION MATERIALS
// ============================================================

// LIST : materiaux d'une formation
exports.listFormationMaterials = async (req, res) => {
  try {
    const { formation_id } = req.params;
    const rows = await db.prepare(`
      SELECT * FROM formation_materials
      WHERE formation_id = ?
      ORDER BY created_at DESC
    `).all(formation_id);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE
exports.createFormationMaterial = async (req, res) => {
  try {
    const { formation_id, title, description, type, file_url, file_size, mime_type, duration_minutes } = req.body;

    if (!formation_id || !title || !type) {
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO formation_materials (
        id, formation_id, title, description, type,
        file_url, file_size, mime_type, duration_minutes,
        uploaded_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, formation_id, title, description || null, type,
           file_url || null, file_size || null, mime_type || null,
           duration_minutes || null, req.user.id, now, now);

    const row = await db.prepare('SELECT * FROM formation_materials WHERE id = ?').get(id);
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE
exports.deleteFormationMaterial = async (req, res) => {
  try {
    await db.prepare('DELETE FROM formation_materials WHERE id = ?').run(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// MODULE MATERIALS
// ============================================================

// LIST : materiaux d'un module
exports.listModuleMaterials = async (req, res) => {
  try {
    const { module_id } = req.params;
    const rows = await db.prepare(`
      SELECT * FROM module_materials
      WHERE module_id = ?
      ORDER BY release_date ASC, created_at ASC
    `).all(module_id);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// LIST : modules disponibles par date (apprenant)
exports.listAvailableModules = async (req, res) => {
  try {
    const { formation_id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const rows = await db.prepare(`
      SELECT mm.*, m.title as module_title
      FROM module_materials mm
      LEFT JOIN modules m ON m.id = mm.module_id
      WHERE m.formation_id = ?
        AND (mm.release_date IS NULL OR mm.release_date <= ?)
      ORDER BY mm.release_date ASC, mm.created_at ASC
    `).all(formation_id, today);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE
exports.createModuleMaterial = async (req, res) => {
  try {
    const { module_id, title, description, type, file_url, file_size, mime_type, release_date } = req.body;

    if (!module_id || !title || !type) {
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO module_materials (
        id, module_id, title, description, type,
        file_url, file_size, mime_type, release_date,
        uploaded_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, module_id, title, description || null, type,
           file_url || null, file_size || null, mime_type || null,
           release_date || null, req.user.id, now, now);

    const row = await db.prepare('SELECT * FROM module_materials WHERE id = ?').get(id);
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE
exports.deleteModuleMaterial = async (req, res) => {
  try {
    await db.prepare('DELETE FROM module_materials WHERE id = ?').run(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = exports;