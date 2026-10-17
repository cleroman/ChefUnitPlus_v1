// =============================================================
// ChefUnitPlus - EnrollmentController
// Gestion complete des inscriptions et paiements
// =============================================================

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { normalizeEnrollment } = require('../utils/type_converter');

// ============================================================
// HELPER : Creer une notification
// ============================================================
async function createNotification(userId, title, message, type, link) {
  try {
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      uuidv4(), userId, title, message, type, link || null, new Date().toISOString()
    );
  } catch (e) {
    console.error('[createNotification] error:', e);
  }
}

// ============================================================
// HELPER : Generer OTP
// ============================================================
async function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================================
// APPRENANT : Initier une inscription
// POST /api/enrollments
// ============================================================
exports.create = async (req, res) => {
  try {

    // Passer le role a 'apprenant' lors de l'inscription a une formation
    const userIdEnroll = req.user?.userId || req.user?.id;
    if (userIdEnroll) {
      try {
        await db.prepare("UPDATE users SET role = 'apprenant', updated_at = ? WHERE id = ? AND role = 'utilisateur'")
          .run(new Date().toISOString(), userIdEnroll);
        console.log('[OK] Role passe a apprenant pour : ' + userIdEnroll);
      } catch (e) {
        console.warn('[!] Erreur update role : ' + e.message);
      }
    }    const userId = req.user?.userId || req.user?.id;
    const { formation_id, phone, account_name } = req.body;

    if (!formation_id) {
      return res.status(400).json({ success: false, message: 'formation_id requis' });
    }

    const formation = await db.prepare('SELECT * FROM formations WHERE id = ?').get(formation_id);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation introuvable' });
    }

    // Verifier si deja inscrit
    const existing = await db.prepare(`
      SELECT id, status FROM enrollments 
      WHERE learner_id = ? AND formation_id = ?
    `).get(userId, formation_id);

    if (existing) {
      if (existing.status === 'approved') {
        return res.status(400).json({ success: false, message: 'Deja inscrit et valide' });
      }
      // Mettre a jour l'enrollment existant
      const now = new Date().toISOString();
      const otp = generateOtp();
      await db.prepare(`
        UPDATE enrollments 
        SET phone = ?, account_name = ?, payment_otp = ?, requested_at = ?
        WHERE id = ?
      `).run(phone || '', account_name || '', otp, now, existing.id);

      return res.json({
        success: true,
        message: 'Inscription mise a jour. Un code OTP a ete envoye.',
        data: { id: existing.id, otp_sent: true, otp_debug: otp }
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const otp = generateOtp();

    db.prepare(`
      INSERT INTO enrollments (
        id, learner_id, formation_id, formation_title, status,
        amount_paid, requested_at, phone, account_name, payment_otp, progress_percent
      ) VALUES (?, ?, ?, ?, 'pending_payment', 0, ?, ?, ?, ?, 0)
    `).run(
      id, userId, formation_id, formation.title,
      now, phone || '', account_name || '', otp
    );

    res.status(201).json({
      success: true,
      message: 'Inscription initiee. Un code OTP a ete envoye.',
      data: { id, otp_sent: true, otp_debug: otp }
    });
  } catch (error) {
    console.error('[enrollment.create] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// APPRENANT : Confirmer avec OTP (PAIEMENT)
// PATCH /api/enrollments/:id/confirm-otp
// ============================================================
exports.confirmOtp = async (req, res) => {
  try {

    // Passer le role a 'apprenant' lors de l'inscription a une formation
    const userIdEnroll = req.user?.userId || req.user?.id;
    if (userIdEnroll) {
      try {
        await db.prepare("UPDATE users SET role = 'apprenant', updated_at = ? WHERE id = ? AND role = 'utilisateur'")
          .run(new Date().toISOString(), userIdEnroll);
        console.log('[OK] Role passe a apprenant pour : ' + userIdEnroll);
      } catch (e) {
        console.warn('[!] Erreur update role : ' + e.message);
      }
    }    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'otp requis' });
    }

    const enrollment = await db.prepare('SELECT * FROM enrollments WHERE id = ? AND learner_id = ?').get(id, userId);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment introuvable' });
    }

    if (enrollment.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Deja valide' });
    }

    // Verifier OTP
    if (enrollment.payment_otp && enrollment.payment_otp !== otp) {
      return res.status(400).json({ success: false, message: 'Code OTP incorrect' });
    }

    // Recuperer la formation
    const formation = await db.prepare('SELECT * FROM formations WHERE id = ?').get(enrollment.formation_id);
    const learner = await db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId);

    const now = new Date().toISOString();
    const amount = formation?.price || 0;
    const paymentRef = 'PAY-' + Date.now();

    // Mettre a jour l'enrollment
    await db.prepare(`
      UPDATE enrollments 
      SET status = 'pending_payment',
          amount_paid = ?,
          payment_ref = ?,
          paid_at = ?,
          payment_otp = NULL
      WHERE id = ?
    `).run(amount, paymentRef, now, id);

    // ============================================================
    // NOTIFICATION A L'APPRENANT (confirmation de paiement)
    // ============================================================
    createNotification(
      userId,
      'Paiement confirme',
      'Votre paiement de ' + amount + ' USD pour "' + (formation?.title || 'formation') + '" a ete confirme. En attente de validation par le directeur.',
      'payment_confirmed',
      '/learner/enrollments'
    );

    // ============================================================
    // NOTIFICATION AU DIRECTEUR
    // ============================================================
    if (formation && formation.director_id) {
      createNotification(
        formation.director_id,
        'Nouveau paiement a valider',
        (learner?.full_name || 'Un apprenant') + ' a paye ' + amount + ' USD pour "' + formation.title + '". A valider.',
        'enrollment_pending',
        '/director/enrollments'
      );
    }

    res.json({
      success: true,
      message: 'Paiement confirme. En attente de validation.',
      data: {
        id,
        status: 'pending_payment',
        amount_paid: amount,
        payment_ref: paymentRef,
        paid_at: now
      }
    });
  } catch (error) {
    console.error('[enrollment.confirmOtp] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// APPRENANT : Mes inscriptions
// GET /api/enrollments/me
// ============================================================
exports.myEnrollments = async (req, res) => {
  try {

    // Passer le role a 'apprenant' lors de l'inscription a une formation
    const userIdEnroll = req.user?.userId || req.user?.id;
    if (userIdEnroll) {
      try {
        await db.prepare("UPDATE users SET role = 'apprenant', updated_at = ? WHERE id = ? AND role = 'utilisateur'")
          .run(new Date().toISOString(), userIdEnroll);
        console.log('[OK] Role passe a apprenant pour : ' + userIdEnroll);
      } catch (e) {
        console.warn('[!] Erreur update role : ' + e.message);
      }
    }    const userId = req.user?.userId || req.user?.id;

    const enrollments = await db.prepare(`
      SELECT 
        e.*,
        f.title as formation_title_full,
        u.full_name as learner_name
      FROM enrollments e
      LEFT JOIN formations f ON f.id = e.formation_id
      LEFT JOIN users u ON u.id = e.learner_id
      WHERE e.learner_id = ?
      ORDER BY e.requested_at DESC
    `).all(userId);

    res.json({
      success: true,
      data: enrollments.map(normalizeEnrollment),
      count: enrollments.length
    });
  } catch (error) {
    console.error('[enrollment.myEnrollments] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// APPRENANT : Recu
// GET /api/enrollments/:id/receipt
// ============================================================
exports.getReceipt = async (req, res) => {
  try {

    // Passer le role a 'apprenant' lors de l'inscription a une formation
    const userIdEnroll = req.user?.userId || req.user?.id;
    if (userIdEnroll) {
      try {
        await db.prepare("UPDATE users SET role = 'apprenant', updated_at = ? WHERE id = ? AND role = 'utilisateur'")
          .run(new Date().toISOString(), userIdEnroll);
        console.log('[OK] Role passe a apprenant pour : ' + userIdEnroll);
      } catch (e) {
        console.warn('[!] Erreur update role : ' + e.message);
      }
    }    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const enrollment = await db.prepare(`
      SELECT 
        e.*,
        f.title as formation_title_full,
        u.full_name as learner_name
      FROM enrollments e
      LEFT JOIN formations f ON f.id = e.formation_id
      LEFT JOIN users u ON u.id = e.learner_id
      WHERE e.id = ? AND (e.learner_id = ? OR ? = 'directeur' OR ? = 'admin')
    `).get(id, userId, req.user?.role, req.user?.role);

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Recu introuvable' });
    }

    res.json({
      success: true,
      data: {
        receipt_number: enrollment.receipt_number,
        learner_name: enrollment.learner_name,
        formation_title: enrollment.formation_title_full,
        amount_paid: enrollment.amount_paid,
        payment_ref: enrollment.payment_ref,
        paid_at: enrollment.paid_at,
        validated_at: enrollment.validated_at,
        status: enrollment.status
      }
    });
  } catch (error) {
    console.error('[enrollment.getReceipt] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// DIRECTEUR : Paiements en attente de validation
// GET /api/enrollments/pending
// ============================================================
exports.pendingForDirector = async (req, res) => {
  try {

    // Passer le role a 'apprenant' lors de l'inscription a une formation
    const userIdEnroll = req.user?.userId || req.user?.id;
    if (userIdEnroll) {
      try {
        await db.prepare("UPDATE users SET role = 'apprenant', updated_at = ? WHERE id = ? AND role = 'utilisateur'")
          .run(new Date().toISOString(), userIdEnroll);
        console.log('[OK] Role passe a apprenant pour : ' + userIdEnroll);
      } catch (e) {
        console.warn('[!] Erreur update role : ' + e.message);
      }
    }    const directorId = req.user?.userId || req.user?.id;
    const role = req.user?.role;

    let query = `
      SELECT 
        e.id,
        e.learner_id,
        e.formation_id,
        e.formation_title,
        e.status,
        e.amount_paid,
        e.payment_ref,
        e.phone,
        e.account_name,
        e.requested_at,
        e.paid_at,
        u.full_name as learner_name,
        u.email as learner_email,
        f.title as formation_title_full,
        f.director_id
      FROM enrollments e
      LEFT JOIN users u ON u.id = e.learner_id
      LEFT JOIN formations f ON f.id = e.formation_id
      WHERE e.status = 'pending_payment' AND e.paid_at IS NOT NULL
    `;
    const params = [];

    if (role === 'directeur') {
      query += ' AND f.director_id = ?';
      params.push(directorId);
    }

    query += ' ORDER BY e.paid_at DESC';

    const rows = await db.prepare(query).all(...params);

    res.json({
      success: true,
      data: rows.map(normalizeEnrollment),
      count: rows.length
    });
  } catch (error) {
    console.error('[enrollment.pendingForDirector] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Alias pour compatibilite
exports.pending = exports.pendingForDirector;

// ============================================================
// DIRECTEUR : Valider un paiement
// PATCH /api/enrollments/:id/validate
// ============================================================
exports.validate = async (req, res) => {
  try {

    // Passer le role a 'apprenant' lors de l'inscription a une formation
    const userIdEnroll = req.user?.userId || req.user?.id;
    if (userIdEnroll) {
      try {
        await db.prepare("UPDATE users SET role = 'apprenant', updated_at = ? WHERE id = ? AND role = 'utilisateur'")
          .run(new Date().toISOString(), userIdEnroll);
        console.log('[OK] Role passe a apprenant pour : ' + userIdEnroll);
      } catch (e) {
        console.warn('[!] Erreur update role : ' + e.message);
      }
    }    const { id } = req.params;
    const directorId = req.user?.userId || req.user?.id;
    const comment = req.body?.director_comment || req.body?.comment || '';
    const otp = req.body?.otp || '';

    const enrollment = await db.prepare('SELECT * FROM enrollments WHERE id = ?').get(id);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment introuvable' });
    }

    if (enrollment.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Deja valide' });
    }

    const receiptNumber = 'REC-' + Date.now();
    const now = new Date().toISOString();

    await db.prepare(`
      UPDATE enrollments 
      SET status = 'approved',
          validated_at = ?,
          validated_by = ?,
          director_comment = ?,
          receipt_number = ?
      WHERE id = ?
    `).run(now, directorId, comment, receiptNumber, id);

    // ============================================================
    // NOTIFICATION A L'APPRENANT
    // ============================================================
    const formation = await db.prepare('SELECT title FROM formations WHERE id = ?').get(enrollment.formation_id);

    createNotification(
      enrollment.learner_id,
      'Paiement valide',
      'Votre paiement pour "' + (formation?.title || enrollment.formation_title) + '" a ete valide. Recu : ' + receiptNumber,
      'enrollment_validated',
      '/learner/enrollments'
    );

    res.json({
      success: true,
      message: 'Paiement valide',
      data: {
        id,
        status: 'approved',
        validated_at: now,
        receipt_number: receiptNumber
      }
    });
  } catch (error) {
    console.error('[enrollment.validate] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// DIRECTEUR : Refuser un paiement
// PATCH /api/enrollments/:id/reject
// ============================================================
exports.reject = async (req, res) => {
  try {

    // Passer le role a 'apprenant' lors de l'inscription a une formation
    const userIdEnroll = req.user?.userId || req.user?.id;
    if (userIdEnroll) {
      try {
        await db.prepare("UPDATE users SET role = 'apprenant', updated_at = ? WHERE id = ? AND role = 'utilisateur'")
          .run(new Date().toISOString(), userIdEnroll);
        console.log('[OK] Role passe a apprenant pour : ' + userIdEnroll);
      } catch (e) {
        console.warn('[!] Erreur update role : ' + e.message);
      }
    }    const { id } = req.params;
    const directorId = req.user?.userId || req.user?.id;
    const reason = req.body?.director_comment || req.body?.comment || req.body?.reason || '';

    const enrollment = await db.prepare('SELECT * FROM enrollments WHERE id = ?').get(id);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment introuvable' });
    }

    const now = new Date().toISOString();

    await db.prepare(`
      UPDATE enrollments 
      SET status = 'rejected',
          validated_at = ?,
          validated_by = ?,
          director_comment = ?
      WHERE id = ?
    `).run(now, directorId, reason, id);

    // ============================================================
    // NOTIFICATION A L'APPRENANT
    // ============================================================
    const formation = await db.prepare('SELECT title FROM formations WHERE id = ?').get(enrollment.formation_id);

    createNotification(
      enrollment.learner_id,
      'Paiement refuse',
      'Votre paiement pour "' + (formation?.title || enrollment.formation_title) + '" a ete refuse. ' + (reason ? 'Raison : ' + reason : ''),
      'enrollment_rejected',
      '/learner/enrollments'
    );

    res.json({
      success: true,
      message: 'Paiement refuse',
      data: { id, status: 'rejected', rejected_at: now }
    });
  } catch (error) {
    console.error('[enrollment.reject] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// ==========================================================
// TERMINER UNE FORMATION -> Retour automatique a 'utilisateur'
// ==========================================================
exports.complete = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    // 1. Marquer l'enrollment comme termine
    await db.prepare(`
      UPDATE enrollments 
      SET is_active = false, completed_at = ?, status = 'completed'
      WHERE id = ?
    `).run(new Date().toISOString(), enrollmentId);

    // 2. Passer le role de l'utilisateur a 'utilisateur'
    await db.prepare(`
      UPDATE users 
      SET role = 'utilisateur', current_formation_id = NULL, formation_started_at = NULL, updated_at = ?
      WHERE id = ? AND role = 'apprenant'
    `).run(new Date().toISOString(), userId);

    console.log('[OK] Formation terminee - Retour a utilisateur : ' + userId);

    return res.json({
      success: true,
      message: 'Formation terminee. Vous etes maintenant utilisateur.',
    });
  } catch (err) {
    console.error('completeEnrollment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};