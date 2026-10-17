const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/qr.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

router.get('/my', authenticate, ctrl.listMy);
router.get('/:id', authenticate, ctrl.getById);
router.post('/generate', authenticate, requireRole('admin', 'directeur'), ctrl.generateForPayment);
router.post('/scan', authenticate, requireRole('admin', 'directeur', 'formateur'), ctrl.scan);
router.patch('/:id/deactivate', authenticate, requireRole('admin', 'directeur'), ctrl.deactivate);

// Scan par formateur
router.post('/scan-by-trainer', authenticate, requireRole('formateur'), ctrl.scanByTrainer);

module.exports = router;