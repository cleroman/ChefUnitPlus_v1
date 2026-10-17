// ChefUnitPlus - Routes inscriptions
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/enrollment.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

router.use(authenticate);

// ============================================================
// APPRENANT
// ============================================================

// Initier une inscription (avec phone + accountName)
router.post('/', ctrl.create);

// Confirmer avec l'OTP recu par SMS
router.patch('/:id/confirm-otp', ctrl.confirmOtp);

// Mes inscriptions
router.get('/me', ctrl.myEnrollments);

// Recu (avec donnees pour QR)
router.get('/:id/receipt', ctrl.getReceipt);

// ============================================================
// DIRECTEUR
// ============================================================

// Liste des inscriptions en attente
router.get('/pending', requireRole('directeur', 'admin'), ctrl.pendingForDirector);

// Valider avec OTP
router.patch('/:id/validate', requireRole('directeur', 'admin'), ctrl.validate);

// Refuser
router.patch('/:id/reject', requireRole('directeur', 'admin'), ctrl.reject);

module.exports = router;