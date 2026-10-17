// ChefUnitPlus - Chat Routes
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chat.controller');
const { authenticate } = require('../middlewares/auth');

// Toutes les routes chat demandent une auth
router.get('/conversations', authenticate, ctrl.listConversations);
router.post('/conversations', authenticate, ctrl.createConversation);
router.get('/conversations/:id/messages', authenticate, ctrl.getMessages);
router.post('/conversations/:id/messages', authenticate, ctrl.sendMessage);

module.exports = router;