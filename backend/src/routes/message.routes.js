// =============================================================
// ChefUnitPlus - Message Routes
// =============================================================

const express = require('express');
const router = express.Router();
const controller = require('../controllers/message.controller');
const { authenticate } = require('../middlewares/auth');

// Routes messages
router.get('/my', authenticate, controller.myMessages);
router.get('/sent', authenticate, controller.sentMessages);
router.get('/contacts', authenticate, controller.contacts);
router.post('/', authenticate, controller.sendMessage);
router.patch('/read-all', authenticate, controller.markAllAsRead);
router.patch('/:id/read', authenticate, controller.markAsRead);
router.delete('/:id', authenticate, controller.deleteMessage);

module.exports = router;