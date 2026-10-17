// =============================================================
// ChefUnitPlus - Payment Requests Controller
// Gere les paiements manuels Mobile Money
// =============================================================
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// ============================================================
// CREATE : soumettre un paiement
// ============================================================
exports.create = async (req, res) => {
  try {
    const {
      payment_number_id,
      formation_id,
      enrollment_id,
      amount,
      currency,
      reference_number,
      sender_name,
      sender_phone,
    } = req.body;

    const userId = req.user.id;

    // Validations
    if (!payment_number_id) return res.status(400).json({ success: false, message: 'Numero de reception requis' });
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Montant invalide' });
    if (!reference_number) return res.status(400).json({ success: false, message: 'Reference requise' });
    if (!sender_name || sender_name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Nom du compte requis' });
    }
    if (!sender_phone || sender_phone.replace(/\s/g, '').length < 9) {
      return res.status(400).json({ success: false, message: 'Numero de telephone requis' });
    }

    // Verifier le numero de reception
    const paymentNumber = await db.prepare(`SELECT * FROM payment_numbers WHERE id = ? AND is_active = '1'`).get(payment_number_id);
    if (!paymentNumber) return res.status(404).json({ success: false, message: 'Numero de reception introuvable' });

    // Verifier la reference : 6 chiffres
    const normalized = reference_number.replace(/\s/g, '');
    if (!/^\d{6}$/.test(normalized)) {
      return res.status(400).json({
        success: false,
        message: 'Le code de reference doit contenir exactement 6 chiffres',
      });
    }

    // Normaliser le telephone
    const normalizedPhone = sender_phone.replace(/\s/g, '');

    // Creer la demande
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO payment_requests (
        id, user_id, enrollment_id, formation_id,
        payment_number_id, operator, amount, currency,
        reference_number, sender_name, sender_phone,
        status, submitted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(
      id, userId, enrollment_id || null, formation_id || null,
      payment_number_id, paymentNumber.operator, amount, currency || 'USD',
      normalized, sender_name.trim(), normalizedPhone,
      now, now, now
    );

    const row = await db.prepare(`
      SELECT pr.*, pn.display_name as payment_number_name, pn.phone_number as payment_number_phone
      FROM payment_requests pr
      LEFT JOIN payment_numbers pn ON pn.id = pr.payment_number_id
      WHERE pr.id = ?
    `).get(id);

    return res.status(201).json({
      success: true,
      message: 'Paiement soumis. En attente de validation.',
      data: row,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// LIST : tous les paiements (admin/directeur)
// ============================================================
exports.list = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT pr.*,
             u.full_name as user_name, u.email as user_email,
             pn.display_name as payment_number_name, pn.phone_number as payment_number_phone
      FROM payment_requests pr
      LEFT JOIN users u ON u.id = pr.user_id
      LEFT JOIN payment_numbers pn ON pn.id = pr.payment_number_id
    `;
    const params = [];

    if (status) {
      query += ' WHERE pr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY pr.submitted_at DESC';

    const rows = await db.prepare(query).all(...params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// LIST MY : mes paiements (apprenant)
// ============================================================
exports.listMy = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await db.prepare(`
      SELECT pr.*, pn.display_name as payment_number_name, pn.phone_number as payment_number_phone
      FROM payment_requests pr
      LEFT JOIN payment_numbers pn ON pn.id = pr.payment_number_id
      WHERE pr.user_id = ?
      ORDER BY pr.submitted_at DESC
    `).all(userId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GET BY ID
// ============================================================
exports.getById = async (req, res) => {
  try {
    const row = await db.prepare(`
      SELECT pr.*,
             u.full_name as user_name, u.email as user_email,
             pn.display_name as payment_number_name, pn.phone_number as payment_number_phone
      FROM payment_requests pr
      LEFT JOIN users u ON u.id = pr.user_id
      LEFT JOIN payment_numbers pn ON pn.id = pr.payment_number_id
      WHERE pr.id = ?
    `).get(req.params.id);

    if (!row) return res.status(404).json({ success: false, message: 'Paiement introuvable' });
    return res.json({ success: true, data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// VALIDATE : valider un paiement (directeur/admin)
// ============================================================
exports.validate = async (req, res) => {
  try {
    const { id } = req.params;
    const validatorId = req.user.id;

    const existing = await db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Paiement introuvable' });
    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Paiement deja traite' });
    }

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE payment_requests
      SET status = 'validated', validated_at = ?, validated_by = ?, updated_at = ?
      WHERE id = ?
    `).run(now, validatorId, now, id);

    // Si enrollment_id, mettre a jour l'enrollment
    if (existing.enrollment_id) {
      db.prepare('UPDATE enrollments SET status = ?, updated_at = ? WHERE id = ?')
        .run('confirmed', now, existing.enrollment_id);
    }

    const row = await db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(id);

    // Generer automatiquement un QR code
    try {
      const crypto = require('crypto');
      const existing = await db.prepare(`SELECT id FROM qr_codes WHERE user_id = ? AND formation_id = ? AND is_active = '1'`)
        .get(existing.user_id, existing.formation_id);

      if (!existing && existing.formation_id) {
        const formation = await db.prepare('SELECT * FROM formations WHERE id = ?').get(existing.formation_id);
        if (formation) {
          const qrId = uuidv4();
          const qrCode = 'QR-' + crypto.randomBytes(16).toString('hex').toUpperCase();
          const startDate = formation.start_date || now.split('T')[0];
          const endDate = formation.end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          const qrData = JSON.stringify({
            code: qrCode,
            user_id: existing.user_id,
            formation_id: existing.formation_id,
            start_date: startDate,
            end_date: endDate,
          });

          db.prepare(`
            INSERT INTO qr_codes (id, user_id, formation_id, payment_request_id, code, qr_data, start_date, end_date, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          `).run(qrId, existing.user_id, existing.formation_id, id, qrCode, qrData, startDate, endDate, now, now);

          console.log(`  [OK] QR code genere : ${qrCode}`);
        }
      }
    } catch (qrErr) {
      console.log('  [!!] Erreur QR :', qrErr.message);
    }

    return res.json({ success: true, message: 'Paiement valide', data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// REJECT : refuser un paiement
// ============================================================
exports.reject = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const validatorId = req.user.id;

    const existing = await db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Paiement introuvable' });
    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Paiement deja traite' });
    }

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE payment_requests
      SET status = 'rejected', validated_at = ?, validated_by = ?, rejection_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(now, validatorId, reason || null, now, id);

    const row = await db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(id);
    return res.json({ success: true, message: 'Paiement refuse', data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = exports;