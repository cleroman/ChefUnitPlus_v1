// ChefUnitPlus - Auth Routes
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const { uploadRegisterPhoto } = require('../middlewares/upload');
const { authenticate, requireRole } = require('../middlewares/auth');

// Public
router.post('/login', ctrl.login);
router.post('/register-scout', uploadRegisterPhoto, ctrl.registerScout);
router.post('/verify-email', ctrl.verifyEmailV2);
router.post('/resend-verification', ctrl.resendVerification);

// Protege
router.get('/me', authenticate, ctrl.me);

// Directeur / Admin
router.get('/pending-users', authenticate, requireRole('admin', 'directeur'), ctrl.listPendingUsers);
router.patch('/activate/:userId', authenticate, requireRole('admin', 'directeur'), ctrl.activateUser);
router.patch('/deactivate/:userId', authenticate, requireRole('admin', 'directeur'), ctrl.deactivateUser);
router.patch('/admin/users/:userId/validate', authenticate, requireRole('admin', 'directeur'), ctrl.validateUserV2);

router.patch('/admin/users/:userId/validate', authenticate, requireRole('admin', 'directeur'), ctrl.validateUser);
// ============================================================
// DECONNEXION
// ============================================================
router.post('/logout', authenticate, (req, res) => {
  // Le token est gere cote client (suppression du storage)
  // On retourne juste un succes pour confirmer la deconnexion
  res.json({ success: true, message: 'Deconnecte avec succes' });
});

// =============================================================
// ROUTE POUR LES PREUVES (PDF) - pour le frontend
// =============================================================
const database = require('../config/database');
const db = database.db || database;

router.get('/admin/users/:userId/proofs', authenticate, requireRole('admin', 'directeur'), async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }
    
    const proofs = await db.prepare('SELECT * FROM proof_documents WHERE user_id = ?').all(userId);
    
    return res.json({
      success: true,
      data: {
        user: user,
        proofs: proofs
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================
// ADMIN : Changer le statut d'un utilisateur
// =============================================================
router.patch('/admin/users/:userId/status', authenticate, requireRole('admin', 'directeur'), async (req, res) => {
  try {
    const { statut } = req.body;
    const validStatuses = ['pending', 'proofs_pending', 'pending_validation', 'validated', 'rejected', 'suspended'];
    
    if (!validStatuses.includes(statut)) {
      return res.status(400).json({ success: false, message: 'Statut invalide' });
    }

    const database = require('../config/database');
    const db = database.db || database;
    const userId = req.params.userId;
    const now = new Date().toISOString();

    const updateData = { statut, updated_at: now };
    if (statut === 'validated') {
      updateData.validated_at = now;
      updateData.is_active = 1;
    }

    const setClause = Object.keys(updateData).map(k => k + ' = ?').join(', ');
    const values = Object.values(updateData);
    values.push(userId);

    await db.prepare('UPDATE users SET ' + setClause + ' WHERE id = ?').run(...values);
    return res.json({ success: true, message: 'Statut mis à jour' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================
// ADMIN : Régénérer le code à 6 chiffres
// =============================================================
router.post('/admin/users/:userId/regenerate-code', authenticate, requireRole('admin', 'directeur'), async (req, res) => {
  try {
    const database = require('../config/database');
    const db = database.db || database;
    const userId = req.params.userId;
    const now = new Date().toISOString();
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.prepare(
      'UPDATE users SET registration_code = ?, code_expires_at = ?, code_is_used = 0, code_attempts = 0, updated_at = ? WHERE id = ?'
    ).run(newCode, expiresAt, now, userId);

    return res.json({ success: true, message: 'Nouveau code généré', code: newCode });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;



