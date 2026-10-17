// =============================================================
// ChefUnitPlus - Videos Routes
// =============================================================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/videos.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');
const { uploadVideoFile } = require('../middlewares/upload');

// GET /api/videos - Liste
router.get('/', authenticate, ctrl.list);

// GET /api/videos/:id
router.get('/:id', authenticate, ctrl.getById);

// POST /api/videos - Creer avec fichier ou URL
router.post(
  '/',
  authenticate,
  requireRole('admin', 'directeur', 'formateur'),
  uploadVideoFile,
  ctrl.create
);

// DELETE /api/videos/:id
router.delete(
  '/:id',
  authenticate,
  requireRole('admin', 'directeur'),
  ctrl.remove
);

module.exports = router;