// ChefUnitPlus - Scout Group Routes
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/scout_group.controller');
const { authenticate, requireRole } = require('../middlewares/auth');

// Public (pour l'inscription)
router.get('/public', ctrl.listPublic);

// Admin
router.get('/', authenticate, requireRole('admin', 'directeur'), ctrl.listAll);
router.post('/', authenticate, requireRole('admin', 'directeur'), ctrl.create);
router.patch('/:id', authenticate, requireRole('admin', 'directeur'), ctrl.update);
router.delete('/:id', authenticate, requireRole('admin'), ctrl.remove);

module.exports = router;