// =============================================================
// ChefUnitPlus - Notification Routes
// =============================================================

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth');

// Mes notifications
router.get('/my', authenticate, ctrl.listMy);

// Marquer une notification comme lue
router.patch('/:id/read', authenticate, ctrl.markAsRead);

// Marquer toutes comme lues
router.patch('/read-all', authenticate, ctrl.markAllAsRead);

// Supprimer une notification
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;