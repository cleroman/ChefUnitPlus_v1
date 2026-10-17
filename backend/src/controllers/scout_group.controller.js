// =============================================================
// ChefUnitPlus - Scout Group Controller
// =============================================================

const db = require('../config/database');

// Liste publique des groupes (pour inscription)
exports.listPublic = async (req, res) => {
  try {
    const groups = await db.prepare(`
      SELECT id, name, region, district, description, is_active
      FROM scout_groups
      WHERE is_active = '1'
      ORDER BY name ASC
    `).all();

    return res.json({
      success: true,
      data: groups,
    });
  } catch (err) {
    console.error('listPublic error:', err);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// Liste complete (admin)
exports.listAll = async (req, res) => {
  try {
    const groups = await db.prepare(`
      SELECT * FROM scout_groups ORDER BY name ASC
    `).all();
    return res.json({ success: true, data: groups });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Creer un groupe
exports.create = async (req, res) => {
  try {
    const { name, region, district, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Nom requis' });
    }
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO scout_groups (id, name, region, district, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, name, region || null, district || null, description || null, now, now);

    return res.status(201).json({
      success: true,
      data: { id, name, region, district },
    });
  } catch (err) {
    console.error('create group error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Modifier
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, region, district, description, is_active } = req.body;
    db.prepare(`
      UPDATE scout_groups SET name = COALESCE(?, name), region = COALESCE(?, region), district = COALESCE(?, district), description = COALESCE(?, description), is_active = COALESCE(?, is_active), updated_at = ? WHERE id = ?
    `).run(name, region, district, description, is_active, new Date().toISOString(), id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Supprimer
exports.remove = async (req, res) => {
  try {
    await db.prepare('DELETE FROM scout_groups WHERE id = ?').run(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};