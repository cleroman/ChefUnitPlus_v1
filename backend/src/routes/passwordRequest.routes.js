// ChefUnitPlus - Routes password requests
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/passwordRequest.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

router.use(authenticate);

// Utilisateur : demander un reset
router.post('/', ctrl.create);

// Admin : voir + approuver + refuser
router.get('/', requireRole('admin'), ctrl.list);
router.patch('/:id/approve', requireRole('admin'), ctrl.approve);
router.patch('/:id/reject', requireRole('admin'), ctrl.reject);

module.exports = router;