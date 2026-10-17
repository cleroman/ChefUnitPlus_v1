// ChefUnitPlus - Routes payment_numbers
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentNumber.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

// Routes publiques (pour les apprenants)
router.get('/active', ctrl.listActive);
router.get('/operators', ctrl.getOperators);
router.post('/validate-reference', authenticate, ctrl.validateReference);

// Routes admin/directeur
router.get('/', authenticate, requireRole('admin', 'directeur'), ctrl.list);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, requireRole('admin'), ctrl.create);
router.patch('/:id', authenticate, requireRole('admin'), ctrl.update);
router.delete('/:id', authenticate, requireRole('admin'), ctrl.remove);

module.exports = router;