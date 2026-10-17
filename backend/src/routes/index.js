// ChefUnitPlus - Agregateur de routes
const express = require('express');
const router = express.Router();

// Imports des routes
const authRoutes = require('./auth.routes');
const messageRoutes = require('./message.routes');
const userRoutes = require('./user.routes');
const formationRoutes = require('./formation.routes');
const formationValidationRoutes = require('./formationValidation.routes');
const moduleRoutes = require('./module.routes');
const lessonRoutes = require('./lesson.routes');
const enrollmentRoutes = require('./enrollment.routes');
const paymentRoutes = require('./payment.routes');
const certificateRoutes = require('./certificate.routes');
const statsRoutes = require('./stats.routes');
const scoutGroupRoutes = require('./scoutGroup.routes');
const complaintRoutes = require('./complaint.routes');
const passwordRequestRoutes = require('./passwordRequest.routes');
const paymentNumberRoutes = require('./paymentNumber.routes');
const paymentRequestRoutes = require('./paymentRequest.routes');
const attendanceRoutes = require('./attendance.routes');
const materialRoutes = require('./material.routes');
const questionRoutes = require('./question.routes');
const qrRoutes = require('./qr.routes');
const notificationRoutes = require('./notification.routes');
const newsRoutes = require('./news.routes');
const videosRoutes = require('./videos.routes');

// ============================================================
// HEALTH
// ============================================================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ChefUnitPlus API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// ============================================================
// MONTAGE DES ROUTES
// ============================================================
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/formations', formationRoutes);
router.use('/formations', formationValidationRoutes);
router.use('/modules', moduleRoutes);
router.use('/lessons', lessonRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/payments', paymentRoutes);
router.use('/certificates', certificateRoutes);
router.use('/stats', statsRoutes);
router.use('/scout-groups', scoutGroupRoutes);
router.use('/complaints', complaintRoutes);
router.use('/password-requests', passwordRequestRoutes);
router.use('/payment-numbers', paymentNumberRoutes);
router.use('/payment-requests', paymentRequestRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/materials', materialRoutes);
router.use('/questions', questionRoutes);
router.use('/qr-codes', qrRoutes);
router.use('/qr', qrRoutes);  // ALIAS pour compatibilite Flutter
router.use('/notifications', notificationRoutes);
router.use('/messages', messageRoutes);
router.use('/news', newsRoutes);
router.use('/videos', videosRoutes);

router.use('/admin', require('./admin.routes'));

module.exports = router;
