// =============================================================
// ChefUnitPlus - Certificate Routes
// =============================================================

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/certificate.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

// Mes certificats
router.get('/my', authenticate, ctrl.listMy);

// Generer un certificat (admin/directeur/system)
router.post('/generate', authenticate,
  requireRole('admin', 'directeur'),
  ctrl.generate);

// Details d'un certificat
router.get('/:id', authenticate, ctrl.getById);

// URL PDF
router.get('/:id/pdf', authenticate, ctrl.getPdfUrl);

module.exports = router;