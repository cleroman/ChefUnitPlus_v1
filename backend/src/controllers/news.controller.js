// =============================================================
// ChefUnitPlus - News Controller
// Gere les actualites, communiques et documents PDF/Word
// =============================================================
const db = require('../config/database');

// GET /api/news - Liste des actualites (public)
exports.list = async (req, res) => {
  try {
    const news = await db.prepare(`
      SELECT 
        n.id, n.title, n.content, n.image_url, n.file_url, n.file_type,
        n.category, n.is_published, n.created_at,
        u.full_name as author_name
      FROM news n
      LEFT JOIN users u ON u.id = n.author_id
      WHERE n.is_published = 1
      ORDER BY n.created_at DESC
      LIMIT 50
    `).all();
    
    return res.json({ success: true, data: news });
  } catch (err) {
    console.error('news.list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/news/:id - Detail
exports.getById = async (req, res) => {
  try {
    const news = await db.prepare(`
      SELECT n.*, u.full_name as author_name
      FROM news n
      LEFT JOIN users u ON u.id = n.author_id
      WHERE n.id = ?
    `).get(req.params.id);
    
    if (!news) {
      return res.status(404).json({ success: false, message: 'Actualite introuvable' });
    }
    
    return res.json({ success: true, data: news });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/news - Creer une actualite (admin/directeur)
exports.create = async (req, res) => {
  try {
    const crypto = require('crypto');
    const { title, content, category, imageUrl } = req.body;
    const id = crypto.randomUUID();
    const authorId = req.user?.userId || req.user?.id;
    
    if (!title) {
      return res.status(422).json({ success: false, message: 'Titre obligatoire' });
    }
    
    // Fichier uploade
    let fileUrl = null;
    let fileType = null;
    if (req.file) {
      fileUrl = '/uploads/news/' + req.file.filename;
      fileType = req.file.mimetype;
    }
    
    await db.prepare(`
      INSERT INTO news (id, title, content, category, image_url, file_url, file_type, author_id, is_published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id, title, content || null, category || 'actualite',
      imageUrl || null, fileUrl, fileType, authorId,
      new Date().toISOString(), new Date().toISOString()
    );
    
    console.log('[OK] News cree : ' + id);
    return res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    console.error('news.create error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/news/:id - Modifier
exports.update = async (req, res) => {
  try {
    const { title, content, category, isPublished } = req.body;
    const updates = [];
    const params = [];
    
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (isPublished !== undefined) { updates.push('is_published = ?'); params.push(isPublished ? 1 : 0); }
    updates.push('updated_at = ?'); params.push(new Date().toISOString());
    params.push(req.params.id);
    
    await db.prepare(`UPDATE news SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return res.json({ success: true, message: 'Actualite mise a jour' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/news/:id
exports.remove = async (req, res) => {
  try {
    await db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);
    return res.json({ success: true, message: 'Actualite supprimee' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};