// ChefUnitPlus - Routes complaints
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/complaint.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

router.use(authenticate);

// Utilisateur : voir ses plaintes + en creer
router.get('/me', ctrl.listMine);
router.post('/', ctrl.create);

// Admin : voir toutes + repondre + fermer
router.get('/', requireRole('admin'), ctrl.list);
router.get('/:id', requireRole('admin'), ctrl.getById);
router.patch('/:id/respond', requireRole('admin'), ctrl.respond);
router.patch('/:id/close', requireRole('admin'), ctrl.close);

module.exports = router;