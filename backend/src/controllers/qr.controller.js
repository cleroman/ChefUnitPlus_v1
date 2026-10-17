const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../config/database');

// ============================================================
// GENERER UN CODE UNIQUE
// ============================================================
async function generateQrCode() {
  return 'QR-' + crypto.randomBytes(16).toString('hex').toUpperCase();
}

// ============================================================
// GENERER UN QR CODE POUR UN PAIEMENT VALIDE
// ============================================================
exports.generateForPayment = async (req, res) => {
  try {
    const { payment_request_id } = req.body;

    if (!payment_request_id) {
      return res.status(400).json({ success: false, message: 'payment_request_id requis' });
    }

    // Recuperer le paiement
    const payment = await db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(payment_request_id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Paiement introuvable' });
    }

    if (payment.status !== 'validated') {
      return res.status(400).json({ success: false, message: 'Le paiement doit etre valide' });
    }

    // Recuperer la formation
    const formation = await db.prepare('SELECT * FROM formations WHERE id = ?').get(payment.formation_id);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation introuvable' });
    }

    // Verifier si un QR existe deja
    const existing = await db.prepare(`
      SELECT * FROM qr_codes
      WHERE user_id = ? AND formation_id = ? AND is_active = '1'
    `).get(payment.user_id, payment.formation_id);

    if (existing) {
      return res.json({ success: true, message: 'QR code deja genere', data: existing });
    }

    // Dates de validite
    const startDate = formation.start_date || new Date().toISOString().split('T')[0];
    const endDate = formation.end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const id = uuidv4();
    const code = generateQrCode();
    const now = new Date().toISOString();

    // Donnees du QR (JSON encode)
    const qrData = JSON.stringify({
      code,
      user_id: payment.user_id,
      formation_id: payment.formation_id,
      formation_title: formation.title,
      start_date: startDate,
      end_date: endDate,
      issued_at: now,
    });

    db.prepare(`
      INSERT INTO qr_codes (
        id, user_id, formation_id, payment_request_id,
        code, qr_data, start_date, end_date,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id, payment.user_id, payment.formation_id, payment_request_id,
      code, qrData, startDate, endDate,
      now, now
    );

    const qr = await db.prepare('SELECT * FROM qr_codes WHERE id = ?').get(id);
    return res.status(201).json({
      success: true,
      message: 'QR code genere',
      data: qr,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// MES QR CODES (apprenant)
// ============================================================
exports.listMy = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date().toISOString();

    const rows = await db.prepare(`
      SELECT q.*, f.title as formation_title, f.start_date, f.end_date
      FROM qr_codes q
      LEFT JOIN formations f ON f.id = q.formation_id
      WHERE q.user_id = ?
      ORDER BY q.created_at DESC
    `).all(userId);

    // Marquer les QR expires
    const qrs = rows.map(q => ({
      ...q,
      is_expired: new Date(q.end_date) < new Date(now),
      is_valid_now: new Date(q.start_date) <= new Date(now) && new Date(q.end_date) >= new Date(now),
    }));

    return res.json({ success: true, data: qrs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GET BY ID
// ============================================================
exports.getById = async (req, res) => {
  try {
    const qr = await db.prepare(`
      SELECT q.*, f.title as formation_title
      FROM qr_codes q
      LEFT JOIN formations f ON f.id = q.formation_id
      WHERE q.id = ?
    `).get(req.params.id);

    if (!qr) return res.status(404).json({ success: false, message: 'QR introuvable' });

    const now = new Date();
    qr.is_expired = new Date(qr.end_date) < now;
    qr.is_valid_now = new Date(qr.start_date) <= now && new Date(qr.end_date) >= now;

    return res.json({ success: true, data: qr });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// SCANNER (verifier un QR)
// ============================================================
exports.scan = async (req, res) => {
  try {
    const { code, scan_type, latitude, longitude } = req.body;
    const scannedBy = req.user.id;

    if (!code) return res.status(400).json({ success: false, message: 'Code requis' });

    const qr = await db.prepare('SELECT * FROM qr_codes WHERE code = ?').get(code);
    if (!qr) {
      db.prepare(`
        INSERT INTO qr_scan_logs (id, qr_code_id, scanned_by, scan_type, is_valid, error_message, scanned_at)
        VALUES (?, 'unknown', ?, ?, 0, 'QR code introuvable', ?)
      `).run(uuidv4(), scannedBy, scan_type || 'check-in', new Date().toISOString());

      return res.status(404).json({ success: false, message: 'QR code invalide' });
    }

    const now = new Date();

    // Verifier la validite
    if (qr.is_active !== 1) {
      return res.status(400).json({ success: false, message: 'QR code desactive' });
    }

    if (new Date(qr.start_date) > now) {
      return res.status(400).json({
        success: false,
        message: `QR code pas encore valide (debut : ${qr.start_date})`,
      });
    }

    if (new Date(qr.end_date) < now) {
      return res.status(400).json({
        success: false,
        message: `QR code expire (fin : ${qr.end_date})`,
      });
    }

    // Enregistrer le scan
    const scanId = uuidv4();
    db.prepare(`
      INSERT INTO qr_scan_logs (id, qr_code_id, scanned_by, scan_type, latitude, longitude, is_valid, scanned_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(scanId, qr.id, scannedBy, scan_type || 'check-in', latitude || null, longitude || null, now.toISOString());

    // Mettre a jour les stats
    await db.prepare(`
      UPDATE qr_codes
      SET scanned_count = scanned_count + 1, last_scanned_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now.toISOString(), now.toISOString(), qr.id);

    const user = await db.prepare('SELECT full_name, email FROM users WHERE id = ?').get(qr.user_id);
    const formation = await db.prepare('SELECT title FROM formations WHERE id = ?').get(qr.formation_id);

    return res.json({
      success: true,
      message: 'QR code valide',
      data: {
        user: user,
        formation: formation,
        scan_type: scan_type || 'check-in',
        scanned_at: now.toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// DESACTIVER UN QR
// ============================================================
exports.deactivate = async (req, res) => {
  try {
    const now = new Date().toISOString();
    await db.prepare(`UPDATE qr_codes SET is_active = '0', updated_at = ? WHERE id = ?`).run(now, req.params.id);
    return res.json({ success: true, message: 'QR code desactive' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// ============================================================
// SCAN PAR FORMATEUR
// Le formateur scanne le QR de l'apprenant
// -> Verifie que le module est programme et que la date est atteinte
// -> Pointe automatiquement la presence de l'apprenant
// ============================================================
exports.scanByTrainer = async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const { code, module_id, latitude, longitude } = req.body;
    const trainerId = req.user.id;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Code QR requis' });
    }
    if (!module_id) {
      return res.status(400).json({ success: false, message: 'Module requis' });
    }

    // 1. Verifier le module
    const module = await db.prepare('SELECT * FROM modules WHERE id = ?').get(module_id);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module introuvable' });
    }

    // 2. Verifier que le formateur est bien le formateur du module
    if (module.trainer_id !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'etes pas le formateur de ce module',
      });
    }

    // 3. Verifier que le module est programme (date atteinte)
    const today = new Date().toISOString().split('T')[0];
    if (module.start_date && module.start_date > today) {
      return res.status(400).json({
        success: false,
        message: `Module pas encore programme (debut : ${module.start_date})`,
      });
    }

    // 4. Verifier que le temps du module est ecoule
    if (module.end_date && module.end_date > today) {
      return res.status(400).json({
        success: false,
        message: `Le temps du module n'est pas encore ecoule (fin : ${module.end_date})`,
      });
    }

    // 5. Verifier le QR code
    const qr = await db.prepare('SELECT * FROM qr_codes WHERE code = ?').get(code);
    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR code introuvable' });
    }

    if (qr.is_active !== 1) {
      return res.status(400).json({ success: false, message: 'QR code desactive' });
    }

    // 6. Verifier que le module n'est PAS deja scanne
    let scannedModules = [];
    try {
      scannedModules = JSON.parse(qr.scanned_modules || '[]');
    } catch (e) {
      scannedModules = [];
    }

    if (scannedModules.includes(module_id)) {
      return res.status(400).json({
        success: false,
        message: 'Ce module a deja ete scanne pour cet apprenant',
      });
    }

    // 7. Verifier que le module appartient a la formation du QR
    if (module.formation_id !== qr.formation_id) {
      return res.status(400).json({
        success: false,
        message: 'Ce module n\'appartient pas a la formation de l\'apprenant',
      });
    }

    // 8. Verifier que l'apprenant est bien inscrit
    const enrollment = await db.prepare(`
      SELECT * FROM enrollments
      WHERE learner_id = ? AND formation_id = ? AND status = 'validated'
    `).get(qr.user_id, qr.formation_id);

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'Apprenant non inscrit ou inscription non validee',
      });
    }

    const now = new Date().toISOString();

    // 9. Enregistrer le scan
    db.prepare(`
      INSERT INTO qr_scan_logs (id, qr_code_id, scanned_by, scan_type, latitude, longitude, is_valid, scanned_at)
      VALUES (?, ?, ?, 'trainer-check-in', ?, ?, 1, ?)
    `).run(uuidv4(), qr.id, trainerId, latitude || null, longitude || null, now);

    // 10. Marquer le module comme scanne
    scannedModules.push(module_id);
    const scannedModulesJson = JSON.stringify(scannedModules);

    // 11. Calculer la progression
    const totalModules = await db.prepare(
      'SELECT COUNT(*) as c FROM modules WHERE formation_id = ?'
    ).get(qr.formation_id).c;

    const progress = totalModules > 0
      ? Math.round((scannedModules.length / totalModules) * 100)
      : 0;

    // 12. Mettre a jour le QR code
    await db.prepare(`
      UPDATE qr_codes
      SET scanned_modules = ?,
          progress_percent = ?,
          scanned_count = scanned_count + 1,
          last_scanned_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(scannedModulesJson, progress, now, now, qr.id);

    // 13. Pointer la presence
    const attendanceId = uuidv4();
    db.prepare(`
      INSERT INTO attendance (
        id, user_id, formation_id, module_id, session_date,
        check_in_time, status, latitude, longitude, notes, created_at,
        scanned_by_trainer_id, scan_type
      ) VALUES (?, ?, ?, ?, ?, ?, 'present', ?, ?, ?, ?, ?, 'trainer-check-in')
    `).run(
      attendanceId, qr.user_id, qr.formation_id, module_id, today,
      now, latitude || null, longitude || null,
      `Scanne par formateur`, now, trainerId
    );

    // 14. Mettre a jour la progression de l'enrollment
    await db.prepare(`
      UPDATE enrollments
      SET progress_percent = ?
      WHERE id = ?
    `).run(progress, enrollment.id);

    
    // ============================================================
    // NOTIFICATION POUR L'APPRENANT (presence pointee)
    // ============================================================
    try {
      const { v4: uuidv4 } = require('uuid');
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, 'Presence pointee', ?, 'attendance_marked', 0, '/learner/enrollments', ?)
      `).run(
        uuidv4(),
        qr.user_id,
        'Votre presence au module "' + module.title + '" a ete pointee. Progression : ' + progress + '%',
        now
      );
    } catch (e) { console.error('[scanByTrainer] notif error:', e); }

    // 15. Si 100% ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ generer le certificat automatiquement
    let certificate = null;
    let completed = false;

    if (progress === 100) {
      completed = true;

      // Mettre a jour l'enrollment
      await db.prepare(`
        UPDATE enrollments
        SET progress_percent = '100', completed_at = ?
        WHERE id = ?
      `).run(now, enrollment.id);

      // Mettre a jour le QR
      await db.prepare(`
        UPDATE qr_codes SET completed_at = ? WHERE id = ?
      `).run(now, qr.id);

      // Generer le certificat
      try {
        const certId = uuidv4();
        const certNumber = 'CERT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        db.prepare(`
          INSERT INTO certificates (
            id, user_id, formation_id, certificate_number,
            issued_at, auto_generated, qr_code_id
          ) VALUES (?, ?, ?, ?, ?, 1, ?)
        `).run(certId, qr.user_id, qr.formation_id, certNumber, now, qr.id);

        certificate = await db.prepare('SELECT * FROM certificates WHERE id = ?').get(certId);
      } catch (certErr) {
        console.error('[scanByTrainer] certificate error:', certErr);
      }

      // Notification de felicitations
      try {
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
          VALUES (?, ?, 'Felicitations !', ?, 'formation_completed', 0, ?)
        `).run(
          uuidv4(), qr.user_id,
          'Felicitations ! Vous avez termine votre formation. Votre certificat est disponible.',
          now
        );
      } catch (notifErr) { /* ignore */ }
    }

    // 16. Recuperer les infos pour la reponse
    const learner = await db.prepare('SELECT full_name, email FROM users WHERE id = ?').get(qr.user_id);
    const formation = await db.prepare('SELECT title FROM formations WHERE id = ?').get(qr.formation_id);

    return res.json({
      success: true,
      message: completed
        ? 'Module scanne ! Formation terminee - Felicitations !'
        : `Module scanne ! Progression : ${progress}%`,
      data: {
        learner: learner,
        formation: formation,
        module: { id: module.id, title: module.title },
        progress: progress,
        scanned_modules: scannedModules.length,
        total_modules: totalModules,
        completed: completed,
        certificate: certificate,
        scanned_at: now,
      },
    });
  } catch (err) {
    console.error('[scanByTrainer] error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
module.exports = exports;