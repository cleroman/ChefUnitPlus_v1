const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const Module = require('../models/Module');
const Formation = require('../models/Formation');
const db = require('../config/database');

// GET /api/modules/by-formation/:id
async function listByFormation(req, res, next) {
  try {
    const onlyApproved = req.query.onlyApproved === 'true';
    const modules = await Module.listByFormation(req.params.id, { onlyApproved });
    return res.json({ success: true, data: modules });
  } catch (err) { next(err); }
}

// GET /api/modules/my (formateur connecte)
async function listMyModules(req, res, next) {
  try {
    const modules = await Module.listByTrainer(req.user.id);
    return res.json({ success: true, data: modules });
  } catch (err) { next(err); }
}

// GET /api/modules/pending (directeur)
async function listPending(req, res, next) {
  try {
    const modules = await Module.listPending();
    return res.json({ success: true, data: modules });
  } catch (err) { next(err); }
}

// GET /api/modules/all (directeur/admin)
async function listAll(req, res, next) {
  try {
    const modules = await Module.listAll();
    return res.json({ success: true, data: modules });
  } catch (err) { next(err); }
}

// GET /api/modules/:id
async function getById(req, res, next) {
  try {
    const m = await Module.findById(req.params.id);
    if (!m) return res.status(404).json({ success: false, message: 'Module introuvable' });
    return res.json({ success: true, data: m });
  } catch (err) { next(err); }
}

// POST /api/modules (FORMATEUR cree un module en attente)
async function create(req, res, next) {
  try {
    const { formationId, title, description } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(422).json({ success: false, message: 'Titre trop court (min 3 caracteres)' });
    }

    // Le formateur propose une formation
    let targetFormationId = formationId;
    if (!targetFormationId) {
      return res.status(422).json({ success: false, message: 'Formation cible requise' });
    }

    const formation = await db.prepare('SELECT id FROM formations WHERE id = ?').get(targetFormationId);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation introuvable' });
    }

    const pdfPath = req.file ? 'uploads/modules/' + req.file.filename : null;

    const module = await Module.create({
      id: uuidv4(),
      formationId: targetFormationId,
      title: title.trim(),
      description: description || null,
      trainerId: req.user.id, // Le createur est le formateur par defaut
      orderIndex: 0,
      hours: 0, // Sera rempli par le directeur
      startDate: null,
      endDate: null,
      pdfPath,
      createdBy: req.user.id,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Module propose. En attente de validation par le directeur.',
      data: module,
    });
  } catch (err) { next(err); }
}

// PATCH /api/modules/:id (edition par le createur si encore pending)
async function update(req, res, next) {
  try {
    const existing = await Module.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Module introuvable' });

    // Le createur peut modifier tant que c'est pending
    const isCreator = existing.created_by === req.user.id;
    const isDirector = req.user.role === 'directeur' || req.user.role === 'admin';

    if (existing.status !== 'pending' && !isDirector) {
      return res.status(403).json({ success: false, message: 'Module deja valide, non modifiable' });
    }

    if (!isCreator && !isDirector) {
      return res.status(403).json({ success: false, message: 'Acces refuse' });
    }

    const fields = { ...req.body };

    // Renommer les cles camelCase vers snake_case
    const map = {
      formationId: 'formation_id',
      trainerId: 'trainer_id',
      startDate: 'start_date',
      endDate: 'end_date',
      pdfPath: 'pdf_path',
    };
    Object.entries(map).forEach(([from, to]) => {
      if (fields[from] !== undefined) {
        fields[to] = fields[from];
        delete fields[from];
      }
    });

    // Traiter le nouveau PDF
    if (req.file) {
      if (existing.pdf_path) {
        const oldPath = path.join(__dirname, '..', '..', existing.pdf_path);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      fields.pdf_path = 'uploads/modules/' + req.file.filename;
    }

    const updated = await Module.update(req.params.id, fields);
    return res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

// PATCH /api/modules/:id/approve (DIRECTEUR valide + ajoute heures + dates)
async function approve(req, res, next) {
  try {
    const { hours, startDate, endDate, trainerId, formationId } = req.body;

    if (hours === undefined || parseInt(hours) <= 0) {
      return res.status(422).json({ success: false, message: 'Volume horaire requis (nombre > 0)' });
    }

    const existing = await Module.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Module introuvable' });
    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Ce module n\'est plus en attente' });
    }

    const updated = await Module.approve(req.params.id, {
      hours: parseInt(hours),
      startDate: startDate || null,
      endDate: endDate || null,
      trainerId: trainerId || null,
      formationId: formationId || null,
      approvedBy: req.user.id,
    });

    // Recalculer le volume horaire total de la formation
    const finalFormationId = formationId || existing.formation_id;
    let totalHours = 0;
    if (finalFormationId) {
      totalHours = await Formation.recalculateHours(finalFormationId);
    }

    return res.json({
      success: true,
      message: 'Module valide et ajoute a la formation',
      data: updated,
      totalHours,
    });
  } catch (err) { next(err); }
}

// PATCH /api/modules/:id/reject (DIRECTEUR refuse)
async function reject(req, res, next) {
  try {
    const { comment } = req.body;

    const existing = await Module.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Module introuvable' });
    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Ce module n\'est plus en attente' });
    }

    const updated = await Module.reject(req.params.id, {
      comment: comment || null,
      approvedBy: req.user.id,
    });

    return res.json({ success: true, message: 'Module refuse', data: updated });
  } catch (err) { next(err); }
}

// DELETE /api/modules/:id
async function remove(req, res, next) {
  try {
    const existing = await Module.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Module introuvable' });

    const isCreator = existing.created_by === req.user.id;
    const isDirector = req.user.role === 'directeur' || req.user.role === 'admin';

    if (existing.status !== 'pending' && !isDirector) {
      return res.status(403).json({ success: false, message: 'Module deja valide' });
    }
    if (!isCreator && !isDirector) {
      return res.status(403).json({ success: false, message: 'Acces refuse' });
    }

    if (existing.pdf_path) {
      const p = path.join(__dirname, '..', '..', existing.pdf_path);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    const formationId = existing.formation_id;
    Module.delete(req.params.id);
    if (formationId) Formation.recalculateHours(formationId);

    return res.json({ success: true, message: 'Module supprime' });
  } catch (err) { next(err); }
}


// ============================================================
// MODULES DISPONIBLES POUR SCAN (formateur)
// Retourne les modules du formateur dont la date est atteinte
// ============================================================
async function getAvailableForScan(req, res) {
  try {
    const db = require('../config/database');
    const trainerId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const modules = await db.prepare(`
      SELECT m.*, f.title as formation_title, f.id as formation_id
      FROM modules m
      LEFT JOIN formations f ON f.id = m.formation_id
      WHERE m.trainer_id = ?
        AND m.status = 'approved'
        AND (m.start_date IS NULL OR m.start_date <= ?)
        AND (m.end_date IS NULL OR m.end_date >= ?)
      ORDER BY m.start_date DESC, m.created_at DESC
    `).all(trainerId, today, today);

    return res.json({ success: true, data: modules });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ============================================================
// INVITER UN FORMATEUR A REDIGER UN MODULE
// ============================================================
async function inviteTrainer(req, res, next) {
  try {
    const { id } = req.params;
    const { trainer_id, message } = req.body;
    const directorId = req.user.id;
    const now = new Date().toISOString();

    if (!trainer_id) {
      return res.status(400).json({ success: false, message: 'trainer_id requis' });
    }

    // Verifier que le module existe
    const module = await db.prepare('SELECT * FROM modules WHERE id = ?').get(id);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module introuvable' });
    }

    // Verifier que le formateur existe et a le bon role
    const trainer = await db.prepare('SELECT id, full_name, role FROM users WHERE id = ? AND role = ?').get(trainer_id, 'formateur');
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Formateur introuvable' });
    }

    // Mettre a jour le module
    await db.prepare(`
      UPDATE modules
      SET invited_trainer_id = ?,
          invitation_status = 'pending',
          invitation_message = ?,
          invited_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(trainer_id, message || null, now, now, id);

    // Enregistrer dans module_invitations
    const invitationId = require('uuid').v4();
    db.prepare(`
      INSERT INTO module_invitations (id, module_id, formation_id, trainer_id, invited_by, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(invitationId, id, module.formation_id, trainer_id, directorId, message || null, now);

    // Notification pour le formateur
    try {
      const notifId = require('uuid').v4();
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
        VALUES (?, ?, 'Invitation a rediger un module', ?, 'module_invitation', 0, ?)
      `).run(notifId, trainer_id, `Vous etes invite a rediger le module "${module.title}"`, now);
    } catch (e) { /* ignore si notifications n'existe pas */ }

    const updated = await db.prepare('SELECT * FROM modules WHERE id = ?').get(id);

    return res.json({
      success: true,
      message: 'Invitation envoyee',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// MES INVITATIONS (formateur)
// ============================================================
async function listMyInvitations(req, res, next) {
  try {
    const trainerId = req.user.id;

    const invitations = await db.prepare(`
      SELECT m.*,
             f.title as formation_title,
             u.full_name as invited_by_name
      FROM modules m
      LEFT JOIN formations f ON f.id = m.formation_id
      LEFT JOIN users u ON u.id = m.invited_by
      WHERE m.invited_trainer_id = ?
        AND m.invitation_status IN ('pending', 'accepted')
      ORDER BY m.invited_at DESC
    `).all(trainerId);

    return res.json({ success: true, data: invitations });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// ACCEPTER UNE INVITATION (formateur)
// ============================================================
async function acceptInvitation(req, res, next) {
  try {
    const { id } = req.params;
    const trainerId = req.user.id;
    const now = new Date().toISOString();

    const module = await db.prepare('SELECT * FROM modules WHERE id = ? AND invited_trainer_id = ?').get(id, trainerId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Invitation introuvable' });
    }

    await db.prepare(`
      UPDATE modules
      SET invitation_status = 'accepted',
          trainer_id = ?,
          accepted_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(trainerId, now, now, id);

    await db.prepare(`
      UPDATE module_invitations
      SET status = 'accepted', responded_at = ?
      WHERE module_id = ? AND trainer_id = ?
    `).run(now, id, trainerId);

    return res.json({ success: true, message: 'Invitation acceptee' });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// REFUSER UNE INVITATION (formateur)
// ============================================================
async function declineInvitation(req, res, next) {
  try {
    const { id } = req.params;
    const trainerId = req.user.id;
    const now = new Date().toISOString();

    await db.prepare(`
      UPDATE modules
      SET invitation_status = 'declined',
          updated_at = ?
      WHERE id = ? AND invited_trainer_id = ?
    `).run(now, id, trainerId);

    await db.prepare(`
      UPDATE module_invitations
      SET status = 'declined', responded_at = ?
      WHERE module_id = ? AND trainer_id = ?
    `).run(now, id, trainerId);

    return res.json({ success: true, message: 'Invitation refusee' });
  } catch (err) {
    next(err);
  }
}
module.exports = {
  listByFormation, listMyModules, listPending, listAll,
  getById, create, update, approve, reject, remove, getAvailableForScan, inviteTrainer, listMyInvitations, acceptInvitation, declineInvitation,
};