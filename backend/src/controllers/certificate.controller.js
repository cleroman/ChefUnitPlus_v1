// =============================================================
// ChefUnitPlus - Certificate Controller
// Gestion des certificats (auto-generation a 100%)
// =============================================================

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// ============================================================
// LISTER MES CERTIFICATS
// ============================================================
exports.listMy = async (req, res) => {
  try {
    const userId = req.user.id;

    const certificates = await db.prepare(`
      SELECT c.*,
             f.title as formation_title,
             f.description as formation_description,
             u.full_name as learner_name
      FROM certificates c
      LEFT JOIN formations f ON c.formation_id = f.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ?
      ORDER BY c.issued_at DESC
    `).all(userId);

    return res.json({ success: true, data: certificates });
  } catch (err) {
    console.error('[certificate.listMy] error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GET PAR ID
// ============================================================
exports.getById = async (req, res) => {
  try {
    const cert = await db.prepare(`
      SELECT c.*,
             f.title as formation_title,
             u.full_name as learner_name
      FROM certificates c
      LEFT JOIN formations f ON c.formation_id = f.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificat introuvable' });
    }

    return res.json({ success: true, data: cert });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GENERER UN CERTIFICAT (appele par scanByTrainer a 100%)
// ============================================================
exports.generate = async (req, res) => {
  try {
    const { user_id, formation_id, qr_code_id } = req.body;

    if (!user_id || !formation_id) {
      return res.status(422).json({
        success: false,
        message: 'user_id et formation_id requis',
      });
    }

    // Verifier si un certificat existe deja
    const existing = await db.prepare(`
      SELECT * FROM certificates
      WHERE user_id = ? AND formation_id = ?
    `).get(user_id, formation_id);

    if (existing) {
      return res.json({
        success: true,
        message: 'Certificat deja existant',
        data: existing,
      });
    }

    // Verifier la progression
    const enrollment = await db.prepare(`
      SELECT * FROM enrollments
      WHERE learner_id = ? AND formation_id = ?
    `).get(user_id, formation_id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Inscription introuvable',
      });
    }

    if (enrollment.progress_percent < 100) {
      return res.status(400).json({
        success: false,
        message: `Progression incomplete : ${enrollment.progress_percent}%`,
      });
    }

    // Generer le certificat
    const id = uuidv4();
    const certNumber = 'CERT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO certificates (
        id, user_id, formation_id, certificate_number,
        issued_at, auto_generated, qr_code_id
      ) VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(id, user_id, formation_id, certNumber, now, qr_code_id || null);

    const certificate = await db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);

    return res.status(201).json({
      success: true,
      message: 'Certificat genere',
      data: certificate,
    });
  } catch (err) {
    console.error('[certificate.generate] error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// URL PDF
// ============================================================
exports.getPdfUrl = async (req, res) => {
  try {
    const cert = await db.prepare('SELECT * FROM certificates WHERE id = ?').get(req.params.id);
    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificat introuvable' });
    }

    return res.json({
      success: true,
      data: {
        id: cert.id,
        certificate_number: cert.certificate_number,
        pdf_url: `/uploads/certificates/${cert.id}.pdf`,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};