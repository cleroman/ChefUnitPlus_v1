// =============================================================
// ChefUnitPlus - Stats Routes
// Endpoints pour les statistiques des dashboards
// =============================================================

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const { authenticate } = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');

// roleGuard peut exporter une fonction directe ou un objet
const requireRole = roleGuard.requireRole || roleGuard;

// ============================================================
// ROUTES
// ============================================================

// Test
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Stats routes OK' });
});

// Stats globales (overview - alias de global)
router.get('/overview', authenticate, statsController.getGlobalStats);

// Stats globales (admin)
router.get('/global', authenticate, statsController.getGlobalStats);

// Stats admin (dashboard admin)
router.get('/admin', authenticate, requireRole('admin', 'directeur'), statsController.getAdminStats);

// Stats apprenant (dashboard apprenant)
router.get('/learner', authenticate, requireRole('apprenant'), statsController.getLearnerStats);

// Stats formateur (dashboard formateur)
router.get('/trainer', authenticate, requireRole('formateur'), statsController.getTrainerStats);

// Stats d'une formation specifique
router.get('/formation/:formationId', authenticate, statsController.getFormationStats);

module.exports = router;