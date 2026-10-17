// ChefUnitPlus - Routes materials
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/material.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

// Formation materials
router.get('/formation/:formation_id', authenticate, ctrl.listFormationMaterials);
router.post('/formation', authenticate, requireRole('admin', 'directeur', 'formateur'), ctrl.createFormationMaterial);
router.delete('/formation/:id', authenticate, requireRole('admin', 'directeur', 'formateur'), ctrl.deleteFormationMaterial);

// Module materials
router.get('/module/:module_id', authenticate, ctrl.listModuleMaterials);
router.get('/formation/:formation_id/modules', authenticate, ctrl.listAvailableModules);
router.post('/module', authenticate, requireRole('admin', 'directeur', 'formateur'), ctrl.createModuleMaterial);
router.delete('/module/:id', authenticate, requireRole('admin', 'directeur', 'formateur'), ctrl.deleteModuleMaterial);

module.exports = router;