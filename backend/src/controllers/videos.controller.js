// =============================================================
// ChefUnitPlus - Videos Controller
// Gere les videos des moments scouts
// =============================================================
const db = require('../config/database');

// GET /api/videos - Liste
exports.list = async (req, res) => {
  try {
    const videos = await db.prepare(`
      SELECT 
        v.id, v.title, v.description, v.video_url, v.thumbnail_url,
        v.duration, v.views, v.created_at,
        u.full_name as author_name
      FROM videos v
      LEFT JOIN users u ON u.id = v.author_id
      WHERE v.is_published = 1
      ORDER BY v.created_at DESC
      LIMIT 100
    `).all();
    
    return res.json({ success: true, data: videos });
  } catch (err) {
    console.error('videos.list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/videos/:id
exports.getById = async (req, res) => {
  try {
    const video = await db.prepare(`
      SELECT v.*, u.full_name as author_name
      FROM videos v
      LEFT JOIN users u ON u.id = v.author_id
      WHERE v.id = ?
    `).get(req.params.id);
    
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video introuvable' });
    }
    
    // Incrementer les vues
    await db.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').run(req.params.id);
    
    return res.json({ success: true, data: video });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/videos - Creer une video
exports.create = async (req, res) => {
  try {
    const crypto = require('crypto');
    const { title, description, videoUrl, thumbnailUrl, duration } = req.body;
    const id = crypto.randomUUID();
    const authorId = req.user?.userId || req.user?.id;
    
    if (!title) {
      return res.status(422).json({ success: false, message: 'Titre obligatoire' });
    }
    
    // Fichier uploade OU URL
    let finalVideoUrl = videoUrl;
    if (req.file) {
      finalVideoUrl = '/uploads/videos/' + req.file.filename;
    }
    
    if (!finalVideoUrl) {
      return res.status(422).json({ success: false, message: 'Fichier video ou URL obligatoire' });
    }
    
    await db.prepare(`
      INSERT INTO videos (id, title, description, video_url, thumbnail_url, duration, author_id, is_published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id, title, description || null, finalVideoUrl,
      thumbnailUrl || null, duration || 0, authorId,
      new Date().toISOString(), new Date().toISOString()
    );
    
    console.log('[OK] Video cree : ' + id);
    return res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    console.error('videos.create error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/videos/:id
exports.remove = async (req, res) => {
  try {
    await db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
    return res.json({ success: true, message: 'Video supprimee' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};