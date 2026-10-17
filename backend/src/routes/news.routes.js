// =============================================================
// ChefUnitPlus - News Routes
// =============================================================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/news.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');
const { uploadNewsFile } = require('../middlewares/upload');

// GET /api/news - Liste (tous les utilisateurs authentifies)
router.get('/', authenticate, ctrl.list);

// GET /api/news/:id
router.get('/:id', authenticate, ctrl.getById);

// POST /api/news - Creer (admin/directeur) avec fichier
router.post(
  '/',
  authenticate,
  requireRole('admin', 'directeur'),
  uploadNewsFile,
  ctrl.create
);

// PATCH /api/news/:id (admin/directeur)
router.patch(
  '/:id',
  authenticate,
  requireRole('admin', 'directeur'),
  ctrl.update
);

// DELETE /api/news/:id (admin/directeur)
router.delete(
  '/:id',
  authenticate,
  requireRole('admin', 'directeur'),
  ctrl.remove
);

module.exports = router;