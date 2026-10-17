const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const Formation = require('../models/Formation');
const Module = require('../models/Module');
const db = require('../config/database');
const { normalizeFormation } = require('../utils/type_converter');

const TYPES = [
  'wood_badge',
  'camp_ecole',
  'training',
  'formation_formateurs',
  'formation_formateurs_adjoints',
];

// GET /api/formations
async function list(req, res, next) {
  try {
    // Recuperer le role de l'utilisateur
    let role = 'apprenant';
    if (req.user) {
      const user = await db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
      if (user) role = user.role;
    }

    // Seuls admin/directeur peuvent voir les formations non publiees
    const isAdminOrDirector = ['admin', 'directeur'].includes(role);
    const includeUnpublished = req.query.all === 'true' && isAdminOrDirector;

    return res.json({ success: true, data: ((await Formation.listAll({ includeUnpublished })) || []).map(normalizeFormation) });
  } catch (err) { next(err); }
}

// GET /api/formations/:id
async function getById(req, res, next) {
  try {
    const f = Formation.findById(req.params.id);
    if (!f) return res.status(404).json({ success: false, message: 'Formation introuvable' });
    return res.json({ success: true, data: f });
  } catch (err) { next(err); }
}

// GET /api/formations/:id/modules
async function listModules(req, res, next) {
  try {
    return res.json({ success: true, data: Module.listByFormation(req.params.id) });
  } catch (err) { next(err); }
}

// POST /api/formations
async function create(req, res, next) {
  try {
    const {
      title, description, price, currency, type,
      startDate, endDate, trainerId, maxParticipants,
    } = req.body;

    if (!title || price === undefined) {
      return res.status(422).json({ success: false, message: 'Titre et prix requis' });
    }
    if (type && !TYPES.includes(type)) {
      return res.status(422).json({ success: false, message: 'Type invalide' });
    }

    let pdfPath = null;
    let fichePath = null;

    if (req.files) {
      if (req.files.pdf && req.files.pdf[0]) {
        pdfPath = 'uploads/formations/' + req.files.pdf[0].filename;
      }
      if (req.files.ficheTechnique && req.files.ficheTechnique[0]) {
        fichePath = 'uploads/formations/' + req.files.ficheTechnique[0].filename;
      }
    }

    const formation = Formation.create({
      id: uuidv4(),
      title, description: description || '',
      price: parseFloat(price), currency: currency || 'USD',
      type: type || 'training',
      startDate: startDate || null, endDate: endDate || null,
      trainerId: trainerId || null, directorId: req.user.id,
      pdfPath, ficheTechniquePath: fichePath,
      maxParticipants: parseInt(maxParticipants) || 0,
    });

    return res.status(201).json({ success: true, message: 'Formation creee', data: formation });
  } catch (err) { next(err); }
}

// PATCH /api/formations/:id
async function update(req, res, next) {
  try {
    const fields = { ...req.body };
    const old = Formation.findById(req.params.id);

    if (req.files) {
      if (req.files.pdf && req.files.pdf[0]) {
        if (old && old.pdf_path) {
          const p = path.join(__dirname, '..', '..', old.pdf_path);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        fields.pdf_path = 'uploads/formations/' + req.files.pdf[0].filename;
      }
      if (req.files.ficheTechnique && req.files.ficheTechnique[0]) {
        if (old && old.fiche_technique_path) {
          const p = path.join(__dirname, '..', '..', old.fiche_technique_path);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        fields.fiche_technique_path = 'uploads/formations/' + req.files.ficheTechnique[0].filename;
      }
    }

    const updated = Formation.update(req.params.id, fields);
    return res.json({ success: true, message: 'Formation mise a jour', data: updated });
  } catch (err) { next(err); }
}

// DELETE
async function remove(req, res, next) {
  try {
    const f = Formation.findById(req.params.id);
    if (f) {
      ['pdf_path', 'fiche_technique_path'].forEach(k => {
        if (f[k]) {
          const p = path.join(__dirname, '..', '..', f[k]);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      });
    }
    Formation.delete(req.params.id);
    return res.json({ success: true, message: 'Formation supprimee' });
  } catch (err) { next(err); }
}

// GET /api/formations/:id/pdf (support)
async function downloadPdf(req, res, next) {
  try {
    const f = Formation.findById(req.params.id);
    if (!f) return res.status(404).json({ success: false, message: 'Formation introuvable' });
    if (!f.pdf_path) return res.status(404).json({ success: false, message: 'Aucun support PDF' });

    // Verifier acces : inscription approuvee OU directeur/admin
    const isStaff = req.user.role === 'directeur' || req.user.role === 'admin';
    if (!isStaff) {
      const e = await db.prepare(`
        SELECT status FROM enrollments
        WHERE learner_id = ? AND formation_id = ? AND status = 'approved'
        LIMIT 1
      `).get(req.user.id, req.params.id);

      if (!e) {
        return res.status(403).json({
          success: false,
          message: 'Acces reserve aux apprenants valides'
        });
      }
    }

    const p = path.join(__dirname, '..', '..', f.pdf_path);
    if (!fs.existsSync(p)) return res.status(404).json({ success: false, message: 'Fichier introuvable' });

    return res.download(p, `Support_${f.title.replace(/\s+/g, '_')}.pdf`);
  } catch (err) { next(err); }
}

// GET /api/formations/:id/fiche-technique
async function downloadFiche(req, res, next) {
  try {
    const f = Formation.findById(req.params.id);
    if (!f) return res.status(404).json({ success: false, message: 'Formation introuvable' });
    if (!f.fiche_technique_path) {
      return res.status(404).json({ success: false, message: 'Aucune fiche technique' });
    }

    // Fiche technique : accessible a TOUS (public marketing)
    const p = path.join(__dirname, '..', '..', f.fiche_technique_path);
    if (!fs.existsSync(p)) return res.status(404).json({ success: false, message: 'Fichier introuvable' });

    return res.download(p, `Fiche_Technique_${f.title.replace(/\s+/g, '_')}.pdf`);
  } catch (err) { next(err); }
}

// POST /:id/recalculate-hours
async function recalculateHours(req, res, next) {
  try {
    const total = Formation.recalculateHours(req.params.id);
    return res.json({ success: true, data: { totalHours: total } });
  } catch (err) { next(err); }
}


// ============================================================
// PATCH /api/formations/:id/publish
// Publier une formation (directeur)
// ============================================================
async function publish(req, res, next) {
  try {
    const f = Formation.findById(req.params.id);
    if (!f) {
      return res.status(404).json({ success: false, message: 'Formation introuvable' });
    }

    // Verifier qu'il y a AU MOINS 1 module valide
    const moduleCount = await db.prepare(
      "SELECT COUNT(*) as c FROM modules WHERE formation_id = ? AND status = 'approved'"
    ).get(f.id).c;

    if (moduleCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de publier : aucun module valide dans cette formation',
      });
    }

    const updated = Formation.update(f.id, { is_published: 1 });
    return res.json({
      success: true,
      message: 'Formation publiee',
      data: updated,
      moduleCount,
    });
  } catch (err) { next(err); }
}

// ============================================================
// PATCH /api/formations/:id/unpublish
// Depublier (masquer du catalogue)
// ============================================================
async function unpublish(req, res, next) {
  try {
    const updated = Formation.update(req.params.id, { is_published: 0 });
    return res.json({
      success: true,
      message: 'Formation depubliee',
      data: updated,
    });
  } catch (err) { next(err); }
}

// ============================================================
// VERIFIER SI UNE FORMATION EST PRETE A ETRE PUBLIEE
// ============================================================
async function checkReadiness(req, res, next) {
  try {
    const { id } = req.params;

    const formation = await db.prepare('SELECT * FROM formations WHERE id = ?').get(id);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation introuvable' });
    }

    const modules = await db.prepare('SELECT * FROM modules WHERE formation_id = ?').all(id);
    const expectedCount = formation.modules_count || 0;
    const actualCount = modules.length;

    const modulesWithTrainer = modules.filter(m => m.trainer_id || m.invited_trainer_id).length;
    const modulesWithPdf = modules.filter(m => m.pdf_path).length;
    const modulesCompleted = modules.filter(m => m.invitation_status === 'completed').length;

    const isReady = actualCount >= expectedCount
      && modulesWithTrainer >= expectedCount
      && modulesWithPdf >= expectedCount;

    const issues = [];
    if (actualCount < expectedCount) {
      issues.push(`Modules crees : ${actualCount}/${expectedCount}`);
    }
    if (modulesWithTrainer < expectedCount) {
      issues.push(`Modules avec formateur : ${modulesWithTrainer}/${expectedCount}`);
    }
    if (modulesWithPdf < expectedCount) {
      issues.push(`Modules avec PDF : ${modulesWithPdf}/${expectedCount}`);
    }

    // Mettre a jour le readiness_status
    const newStatus = isReady ? 'ready' : 'awaiting_modules';
    await db.prepare('UPDATE formations SET readiness_status = ? WHERE id = ?').run(newStatus, id);

    return res.json({
      success: true,
      data: {
        is_ready: isReady,
        readiness_status: newStatus,
        expected_modules: expectedCount,
        actual_modules: actualCount,
        modules_with_trainer: modulesWithTrainer,
        modules_with_pdf: modulesWithPdf,
        modules_completed: modulesCompleted,
        issues: issues,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// PUBLIER UNE FORMATION (avec verification des conditions)
// ============================================================
exports.publish = async (req, res) => {
  try {
    const db = require('../config/database');
    const { id } = req.params;

    const formation = await db.prepare('SELECT * FROM formations WHERE id = ?').get(id);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation introuvable' });
    }

    const modules = await db.prepare('SELECT * FROM modules WHERE formation_id = ?').all(id);
    const expectedCount = formation.modules_count || 0;
    const actualCount = modules.length;
    const withTrainer = modules.filter(m => m.trainer_id || m.invited_trainer_id).length;
    const withPdf = modules.filter(m => m.pdf_path).length;

    const issues = [];
    if (expectedCount === 0) issues.push('Le nombre de modules n\'est pas defini');
    if (actualCount < expectedCount) issues.push('Modules crees : ' + actualCount + '/' + expectedCount);
    if (withTrainer < expectedCount) issues.push('Modules avec formateur : ' + withTrainer + '/' + expectedCount);
    if (withPdf < expectedCount) issues.push('Modules avec PDF : ' + withPdf + '/' + expectedCount);

    if (issues.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'La formation est incomplete.',
        issues: issues,
      });
    }

    const now = new Date().toISOString();
    db.prepare(`UPDATE formations SET is_published = '1', status = ?, readiness_status = ?, published_at = ?, published_by = ? WHERE id = ?`)
      .run('published', 'published', now, req.user.id, id);

    return res.json({
      success: true,
      message: 'Formation publiee avec succes',
      data: { id: id, published_at: now },
    });
  } catch (err) {
    console.error('[publish] error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// DEPUBLIER UNE FORMATION
// ============================================================
exports.unpublish = async (req, res) => {
  try {
    const db = require('../config/database');
    const { id } = req.params;
    const now = new Date().toISOString();
    
    db.prepare(`UPDATE formations SET is_published = '0', status = ?, readiness_status = ?, updated_at = ? WHERE id = ?`)
      .run('draft', 'ready', now, id);

    return res.json({ success: true, message: 'Formation depubliee' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// ============================================================
// VERIFIER SI UNE FORMATION EST PRETE
// ============================================================
exports.checkReadiness = async (req, res) => {
  try {
    const db = require('../config/database');
    const { id } = req.params;

    const formation = await db.prepare('SELECT * FROM formations WHERE id = ?').get(id);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation introuvable' });
    }

    const modules = await db.prepare('SELECT * FROM modules WHERE formation_id = ?').all(id);
    const expectedCount = formation.modules_count || 0;
    const actualCount = modules.length;
    const withTrainer = modules.filter(m => m.trainer_id || m.invited_trainer_id).length;
    const withPdf = modules.filter(m => m.pdf_path).length;
    const completed = modules.filter(m => m.invitation_status === 'completed').length;

    const isReady = expectedCount > 0
      && actualCount >= expectedCount
      && withTrainer >= expectedCount
      && withPdf >= expectedCount;

    const issues = [];
    if (expectedCount === 0) issues.push('Le nombre de modules n\'est pas defini');
    if (actualCount < expectedCount) issues.push('Modules crees : ' + actualCount + '/' + expectedCount);
    if (withTrainer < expectedCount) issues.push('Modules avec formateur : ' + withTrainer + '/' + expectedCount);
    if (withPdf < expectedCount) issues.push('Modules avec PDF : ' + withPdf + '/' + expectedCount);

    // Mettre a jour readiness_status dans la BDD
    const newStatus = isReady ? 'ready' : 'awaiting_modules';
    db.prepare('UPDATE formations SET readiness_status = ?, updated_at = ? WHERE id = ?')
      .run(newStatus, new Date().toISOString(), id);

    return res.json({
      success: true,
      data: {
        is_ready: isReady,
        readiness_status: newStatus,
        expected_modules: expectedCount,
        actual_modules: actualCount,
        modules_with_trainer: withTrainer,
        modules_with_pdf: withPdf,
        modules_completed: completed,
        issues: issues,
      },
    });
  } catch (err) {
    console.error('[checkReadiness] error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
module.exports = {
  list, getById, listModules, create, update, remove,
  downloadPdf, downloadFiche, recalculateHours, TYPES,
  publish,
  unpublish, checkReadiness, checkReadiness,
};