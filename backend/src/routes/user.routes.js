// ChefUnitPlus - Routes users
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole, requireMinRole } = require('../middlewares/roleGuard');

router.use(authenticate);

// Profil personnel (tous)
router.patch('/me', ctrl.updateProfile);
router.get('/me', ctrl.getById);

// Voir un utilisateur
router.get('/roles', authenticate, ctrl.getRoles);
router.get('/:id', ctrl.getById);
router.get('/:id/full-profile', ctrl.getFullProfile);
router.patch('/:id/details', ctrl.updateDetails);

// Directeur+
router.get('/', requireMinRole('directeur'), ctrl.list);
router.patch('/:id/promote', requireMinRole('directeur'), ctrl.promote);
router.patch('/:id/demote', authenticate, requireRole('admin', 'directeur'), ctrl.demoteUser);

// Admin
router.patch('/:id/suspend', requireRole('admin'), ctrl.suspend);
router.patch('/:id/reactivate', requireRole('admin'), ctrl.reactivate);
router.patch('/:id/reset-password', requireRole('admin'), ctrl.resetPassword);
router.delete('/:id', requireRole('admin'), ctrl.remove);


// =============================================================
// ROUTE POUR LES PREUVES (PDF)
// =============================================================
const db = require('../config/database');

router.get('/:id/proofs', authenticate, requireRole('admin', 'directeur'), async (req, res) => {
  try {
    const userId = req.params.id;
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

module.exports = router;

