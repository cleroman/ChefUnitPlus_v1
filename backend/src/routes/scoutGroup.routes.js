// ChefUnitPlus - Routes scout groups
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/scoutGroup.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

// ============================================================
// ROUTE PUBLIQUE (AVANT authenticate) - pour l'inscription
// ============================================================
router.get('/public', ctrl.listPublic);

// ============================================================
// Toutes les autres routes necessitent admin
// ============================================================
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.patch('/:id/assign-director', ctrl.assignDirector);

module.exports = router;