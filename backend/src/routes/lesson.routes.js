const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/lesson.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

router.get('/module/:moduleId', authenticate, ctrl.listByModule);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, requireRole('admin', 'directeur', 'formateur'), ctrl.create);
router.patch('/:id', authenticate, requireRole('admin', 'directeur', 'formateur'), ctrl.update);
router.delete('/:id', authenticate, requireRole('admin', 'directeur', 'formateur'), ctrl.remove);

module.exports = router;