// ChefUnitPlus - Routes attendance
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendance.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

router.post('/check-in', authenticate, ctrl.checkIn);
router.patch('/:id/check-out', authenticate, ctrl.checkOut);
router.get('/my', authenticate, ctrl.listMy);
router.get('/formation/:formation_id', authenticate, requireRole('admin', 'directeur', 'formateur'), ctrl.listByFormation);
router.get('/stats/:formation_id', authenticate, ctrl.getStats);

module.exports = router;