// ChefUnitPlus - Controleur PasswordRequest
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const PasswordRequest = require('../models/PasswordRequest');
const User = require('../models/User');
const db = require('../config/database');

// GET /api/password-requests
async function list(req, res, next) {
  try {
    const { status } = req.query;
    const requests = status === 'pending'
      ? PasswordRequest.listPending()
      : PasswordRequest.listAll();
    return res.json({ success: true, data: requests });
  } catch (err) { next(err); }
}

// POST /api/password-requests (demande utilisateur)
async function create(req, res, next) {
  try {
    const { reason } = req.body;
    const request = PasswordRequest.create({
      id: uuidv4(),
      userId: req.user.id,
      reason: reason || 'Demande de reinitialisation'
    });
    return res.status(201).json({
      success: true,
      message: 'Demande enregistree. Un administrateur va traiter votre demande.',
      data: request
    });
  } catch (err) { next(err); }
}

// PATCH /api/password-requests/:id/approve
async function approve(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(422).json({ success: false, message: 'Mot de passe trop court (min 6)' });
    }

    const request = PasswordRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Demande introuvable' });

    // Hacher le nouveau mot de passe
    const hash = await bcrypt.hash(newPassword, 10);

    // Mettre a jour l'utilisateur
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, request.user_id);

    // Marquer la demande comme approuvee
    const updated = PasswordRequest.approve(req.params.id, {
      newPasswordHash: hash,
      processedBy: req.user.id
    });

    return res.json({
      success: true,
      message: 'Mot de passe reinitialise. Communiquez le nouveau mot de passe a l\'utilisateur.',
      data: updated
    });
  } catch (err) { next(err); }
}

// PATCH /api/password-requests/:id/reject
async function reject(req, res, next) {
  try {
    const updated = PasswordRequest.reject(req.params.id, {
      processedBy: req.user.id
    });
    return res.json({ success: true, message: 'Demande refusee', data: updated });
  } catch (err) { next(err); }
}

module.exports = { list, create, approve, reject };