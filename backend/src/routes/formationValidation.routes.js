const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/formationValidation.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

router.get('/:id/can-publish', authenticate, requireRole('admin', 'directeur'), ctrl.canPublish);
router.patch('/:id/publish', authenticate, requireRole('admin', 'directeur'), ctrl.publish);
router.patch('/:id/unpublish', authenticate, requireRole('admin', 'directeur'), ctrl.unpublish);

module.exports = router;