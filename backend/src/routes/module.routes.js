const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/module.controller');
const depositCtrl = require('../controllers/module_deposit.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');
const { uploadModulePdf } = require('../middlewares/upload');

router.use(authenticate);

// ============================================================
// ROUTES SPECIFIQUES (AVANT /:id)
// ============================================================

// --- LISTES SPECIFIQUES ---
router.get('/by-formation/:id', ctrl.listByFormation);
router.get('/my', requireRole('formateur', 'directeur', 'admin'), ctrl.listMyModules);
router.get('/pending', requireRole('directeur', 'admin'), ctrl.listPending);
router.get('/all', requireRole('directeur', 'admin'), ctrl.listAll);

// --- SCAN FORMATEUR ---
router.get('/trainer/available-for-scan', requireRole('formateur'), ctrl.getAvailableForScan);

// --- INVITATIONS FORMATEUR ---
router.post('/:id/invite-trainer', requireRole('directeur', 'admin'), ctrl.inviteTrainer);
router.get('/invitations/my', requireRole('formateur'), ctrl.listMyInvitations);
router.patch('/:id/accept-invitation', requireRole('formateur'), ctrl.acceptInvitation);
router.patch('/:id/decline-invitation', requireRole('formateur'), ctrl.declineInvitation);

// --- DEPOTS DE MODULES (formateur) ---
router.post('/deposit', requireRole('formateur'), uploadModulePdf, depositCtrl.deposit);
router.get('/deposits/my', requireRole('formateur'), depositCtrl.listMyDeposits);

// --- DEPOTS DISPONIBLES (directeur) ---
router.get('/deposits/available', requireRole('directeur', 'admin'), depositCtrl.listAvailableDeposits);

// ============================================================
// ROUTES GENERIQUES (APRES les specifiques)
// ============================================================

// --- CREATION (formateur ou directeur) ---
router.post('/', requireRole('formateur', 'directeur', 'admin'),
  uploadModulePdf, ctrl.create);

// --- MODIFICATION ---
router.patch('/:id', requireRole('formateur', 'directeur', 'admin'),
  uploadModulePdf, ctrl.update);

// --- VALIDATION / REJET ---
router.patch('/:id/approve', requireRole('directeur', 'admin'), ctrl.approve);
router.patch('/:id/reject', requireRole('directeur', 'admin'), ctrl.reject);

// --- SUPPRESSION ---
router.delete('/deposits/:id', requireRole('formateur'), depositCtrl.deleteDeposit);
router.delete('/deposits/:id/detach', requireRole('directeur', 'admin'), depositCtrl.detachFromFormation);
router.delete('/:id', requireRole('formateur', 'directeur', 'admin'), ctrl.remove);

// --- GET PAR ID (EN DERNIER, car /:id capture tout) ---
router.get('/:id', ctrl.getById);

module.exports = router;