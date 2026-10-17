// ChefUnitPlus - Routes payment_requests
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentRequest.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

// Apprenant
router.post('/', authenticate, ctrl.create);
router.get('/my', authenticate, ctrl.listMy);

// Admin/Directeur
router.get('/', authenticate, requireRole('admin', 'directeur'), ctrl.list);
router.get('/:id', authenticate, ctrl.getById);
router.patch('/:id/validate', authenticate, requireRole('admin', 'directeur'), ctrl.validate);
router.patch('/:id/reject', authenticate, requireRole('admin', 'directeur'), ctrl.reject);

module.exports = router;