// ChefUnitPlus - Routes questions
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/question.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

router.post('/', authenticate, ctrl.create);
router.get('/my', authenticate, ctrl.listMy);
router.get('/formation/:formation_id', authenticate, requireRole('admin', 'directeur', 'formateur'), ctrl.listByFormation);
router.get('/:id', authenticate, ctrl.getById);
router.post('/:id/answer', authenticate, ctrl.answer);
router.patch('/:id/close', authenticate, requireRole('admin', 'directeur', 'formateur'), ctrl.close);

module.exports = router;