const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/formation.controller');
const depositCtrl = require('../controllers/module_deposit.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');
const { uploadFormationFiles } = require('../middlewares/upload');

// ============================================================
// PUBLIC
// ============================================================
router.get('/', optionalAuth, ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/modules', ctrl.listModules);
router.get('/:id/fiche-technique', ctrl.downloadFiche);

// ============================================================
// AUTH
// ============================================================
router.get('/:id/pdf', authenticate, ctrl.downloadPdf);

// ============================================================
// DIRECTEUR / ADMIN
// ============================================================
router.post('/', authenticate, requireRole('directeur', 'admin'),
  uploadFormationFiles, ctrl.create);

router.patch('/:id', authenticate, requireRole('directeur', 'admin'),
  uploadFormationFiles, ctrl.update);

router.delete('/:id', authenticate, requireRole('directeur', 'admin'), ctrl.remove);

router.post('/:id/recalculate-hours', authenticate,
  requireRole('directeur', 'admin'), ctrl.recalculateHours);

// NOUVEAU : Publier / Depublier
router.patch('/:id/publish', authenticate,
  requireRole('directeur', 'admin'), ctrl.publish);

router.patch('/:id/unpublish', authenticate,
  requireRole('directeur', 'admin'), ctrl.unpublish);


// Verification de preparation
router.get('/:id/readiness', ctrl.checkReadiness);

// ============================================================
// ATTACHER UN DEPOT DE MODULE A UNE FORMATION (directeur)
// ============================================================
router.post('/:formationId/attach-deposit',
  authenticate,
  requireRole('directeur', 'admin'),
  depositCtrl.attachToFormation
);
module.exports = router;