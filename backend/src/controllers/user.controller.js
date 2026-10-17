// =============================================================
// ChefUnitPlus - Controleur User (etendu Scout)
// =============================================================

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const UserDetails = require('../models/UserDetails');
const ScoutCamp = require('../models/ScoutCamp');
const EmergencyContact = require('../models/EmergencyContact');
const db = require('../config/database');

// GET /api/users
async function list(req, res, next) {
  try {
    const users = await User.listAll({ role: req.query.role });
    return res.json({ success: true, data: users || [] });
  } catch (err) { next(err); }
}

// GET /api/users/:id
async function getById(req, res, next) {
  try {
    const user = User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    return res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

// GET /api/users/:id/full-profile
async function getFullProfile(req, res, next) {
  try {
    const profile = await UserDetails.getFullProfile(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    return res.json({ success: true, data: profile });
  } catch (err) { next(err); }
}

// PATCH /api/users/:id/details
async function updateDetails(req, res, next) {
  try {
    const details = UserDetails.upsert(req.params.id, req.body);
    return res.json({ success: true, message: 'Details mis a jour', data: details });
  } catch (err) { next(err); }
}

// PATCH /api/users/me - Modifier profil
async function updateProfile(req, res, next) {
  try {
    const updated = User.updateProfile(req.user.id, req.body);

    // Mettre a jour les details si fournis
    if (req.body.details) {
      UserDetails.upsert(req.user.id, req.body.details);
    }

    return res.json({ success: true, message: 'Profil mis a jour', data: updated });
  } catch (err) { next(err); }
}

// PATCH /api/users/:id/promote

// ==========================================================
// VALIDATION DES PROMOTIONS (regles metier)
// ==========================================================
async function validatePromotion(actorId, targetId, newRole) {
  const VALID_ROLES = ['utilisateur', 'apprenant', 'formateur', 'directeur'];
  if (!newRole || !VALID_ROLES.includes(newRole)) {
    return { ok: false, code: 422, msg: 'Role invalide : ' + VALID_ROLES.join(', ') };
  }
  
  const target = await db.prepare('SELECT id, role, email FROM users WHERE id = ?').get(targetId);
  if (!target) {
    return { ok: false, code: 404, msg: 'Utilisateur introuvable' };
  }
  
  const actor = await db.prepare('SELECT role FROM users WHERE id = ?').get(actorId);
  const actorRole = actor ? actor.role : 'utilisateur';
  const currentRole = target.role;
  
  if (newRole === 'admin') {
    return { ok: false, code: 403, msg: 'Le role admin ne peut pas etre attribue' };
  }
  
  if (!['admin', 'directeur'].includes(actorRole)) {
    return { ok: false, code: 403, msg: 'Seul un admin ou directeur peut promouvoir' };
  }
  
  if (currentRole === 'directeur' && actorRole !== 'admin') {
    return { ok: false, code: 403, msg: 'Seul un admin peut modifier un directeur' };
  }
  
  if (currentRole === 'apprenant') {
    return { ok: false, code: 403, msg: 'Un apprenant ne peut pas etre promu' };
  }
  
  if (currentRole === 'utilisateur' && newRole === 'directeur') {
    return { ok: false, code: 403, msg: 'Un utilisateur doit d abord etre formateur' };
  }
  
  return { ok: true };
}

async function promote(req, res, next) {
  try {
    const { role } = req.body;
    // === AJOUT : validation des regles ===
    const actorId = req.user?.userId || req.user?.id;
    const check = await validatePromotion(actorId, req.params.id, role);
    if (!check.ok) {
      return res.status(check.code).json({ success: false, message: check.msg });
    }
    // === FIN AJOUT ===
    if (!['apprenant', 'formateur', 'directeur', 'admin'].includes(role)) {
      return res.status(422).json({ success: false, message: 'Role invalide' });
    }
    const updated = User.updateRole(req.params.id, role);
    return res.json({ success: true, message: 'Role mis a jour', data: updated });
  } catch (err) { next(err); }
}

// PATCH /api/users/:id/suspend
async function suspend(req, res, next) {
  try {
    const updated = User.toggleActive(req.params.id, false);
    return res.json({ success: true, message: 'Utilisateur suspendu', data: updated });
  } catch (err) { next(err); }
}

// PATCH /api/users/:id/reactivate
async function reactivate(req, res, next) {
  try {
    const updated = User.toggleActive(req.params.id, true);
    return res.json({ success: true, message: 'Utilisateur reactive', data: updated });
  } catch (err) { next(err); }
}

// PATCH /api/users/:id/reset-password
async function resetPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(422).json({ success: false, message: 'Mot de passe trop court (min 6)' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
    return res.json({ success: true, message: 'Mot de passe reinitialise' });
  } catch (err) { next(err); }
}

// DELETE /api/users/:id
async function remove(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(422).json({ success: false, message: 'Impossible de se supprimer soi-meme' });
    }
    await db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    return res.json({ success: true, message: 'Utilisateur supprime' });
  } catch (err) { next(err); }
}


// =============================================================
// ROLES ET PRIORITES
// =============================================================
const ROLE_PRIORITIES = {
  'admin': 100,
  'directeur': 80,
  'formateur': 60,
  'apprenant': 40,
  'learner': 40,
};

async function demoteUser(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    // === AJOUT : validation des regles ===
    const actorId = req.user?.userId || req.user?.id;
    const check = await validatePromotion(actorId, req.params.id, role);
    if (!check.ok) {
      return res.status(check.code).json({ success: false, message: check.msg });
    }
    // === FIN AJOUT ===

    const VALID_ROLES = Object.keys(ROLE_PRIORITIES);

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role invalide. Roles possibles : ${VALID_ROLES.join(', ')}`,
      });
    }

    const target = await db.prepare('SELECT id, email, role, full_name FROM users WHERE id = ?').get(id);
    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable',
      });
    }

    const actor = req.user;
    const actorPriority = ROLE_PRIORITIES[actor.role] || 0;
    const targetPriority = ROLE_PRIORITIES[target.role] || 0;
    const newPriority = ROLE_PRIORITIES[role] || 0;

    if (actorPriority <= targetPriority) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas degrader un utilisateur de priorite egale ou superieure',
      });
    }

    if (newPriority >= targetPriority) {
      return res.status(400).json({
        success: false,
        message: `Le nouveau role doit avoir une priorite inferieure. ` +
                 `Cible : ${target.role} (${targetPriority}), ` +
                 `Nouveau : ${role} (${newPriority})`,
      });
    }

    db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .run(role, new Date().toISOString(), id);

    const updated = await db.prepare('SELECT id, email, full_name, role, is_active FROM users WHERE id = ?').get(id);

    return res.json({
      success: true,
      message: `Utilisateur degrade : ${target.role} -> ${role}`,
      data: updated,
    });
  } catch (err) {
    console.error('demoteUser error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================
// GET ROLES (liste des roles avec priorites)
// =============================================================
async function getRoles(req, res) {
  try {
    const roles = [
      { name: 'admin',     priority: 100, label: 'Administrateur' },
      { name: 'directeur', priority: 80,  label: 'Directeur' },
      { name: 'formateur', priority: 60,  label: 'Formateur' },
      { name: 'apprenant', priority: 40,  label: 'Apprenant' },
      { name: 'learner',   priority: 40,  label: 'Apprenant (learner)' },
    ];
    return res.json({ success: true, data: roles });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  list, getById, getFullProfile, updateDetails, updateProfile,
  promote, demoteUser, getRoles, suspend, reactivate, resetPassword, remove,
};
