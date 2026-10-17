// =============================================================
// ChefUnitPlus - Module Deposit Controller
// Gere les depots de modules par les formateurs
// et leur attachement aux formations par les directeurs
// =============================================================

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// ============================================================
// DEPOSER UN MODULE (formateur)
// ============================================================
exports.deposit = async (req, res, next) => {
  try {
    const trainerId = req.user.id;
    const { title, description, hours, start_date, end_date } = req.body;

    if (!title) {
      return res.status(422).json({ success: false, message: 'Titre requis' });
    }

    // Recuperer le PDF uploade
    let pdfPath = null;
    let pdfOriginalName = null;
    if (req.file) {
      pdfPath = 'uploads/modules/' + req.file.filename;
      pdfOriginalName = req.file.originalname;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO module_deposits (
        id, trainer_id, title, description, hours,
        pdf_path, pdf_original_name, start_date, end_date,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?)
    `).run(
      id, trainerId, title, description || null,
      parseInt(hours) || 0,
      pdfPath, pdfOriginalName,
      start_date || null, end_date || null,
      now, now
    );

    const deposit = await db.prepare('SELECT * FROM module_deposits WHERE id = ?').get(id);

    
    // ============================================================
    // NOTIFICATION POUR LE DIRECTEUR
    // ============================================================
    try {
      const { v4: uuidv4 } = require('uuid');
      const trainer = await db.prepare('SELECT full_name FROM users WHERE id = ?').get(trainerId);

      // Notifier tous les directeurs et admins
      const directors = await db.prepare("SELECT id FROM users WHERE role IN ('directeur', 'admin') AND is_active = '1'").all();
      const now = new Date().toISOString();

      directors.forEach(d => {
        try {
          db.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
            VALUES (?, ?, 'Nouveau module depose', ?, 'module_deposit', 0, '/director/modules', ?)
          `).run(
            uuidv4(),
            d.id,
            (trainer?.full_name || 'Un formateur') + ' a depose le module "' + title + '". A attacher a une formation.',
            now
          );
        } catch (e) { /* ignore */ }
      });
    } catch (e) { console.error('[deposit] notif error:', e); }

    return res.status(201).json({
      success: true,
      message: 'Module depose avec succes',
      data: deposit,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// MES DEPOTS (formateur)
// ============================================================
exports.listMyDeposits = async (req, res, next) => {
  try {
    const trainerId = req.user.id;

    const deposits = await db.prepare(`
      SELECT d.*,
             m.title as attached_module_title,
             f.title as attached_formation_title
      FROM module_deposits d
      LEFT JOIN modules m ON d.attached_to_module_id = m.id
      LEFT JOIN formations f ON m.formation_id = f.id
      WHERE d.trainer_id = ?
      ORDER BY d.created_at DESC
    `).all(trainerId);

    return res.json({ success: true, data: deposits });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// LISTER TOUS LES DEPOTS DISPONIBLES (directeur)
// ============================================================
exports.listAvailableDeposits = async (req, res, next) => {
  try {
    const deposits = await db.prepare(`
      SELECT d.*, u.full_name as trainer_name, u.email as trainer_email
      FROM module_deposits d
      LEFT JOIN users u ON d.trainer_id = u.id
      WHERE d.status = 'available'
      ORDER BY d.created_at DESC
    `).all();

    return res.json({ success: true, data: deposits });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ATTACHER UN DEPOT A UNE FORMATION (directeur)
// ============================================================
exports.attachToFormation = async (req, res, next) => {
  try {
    const directorId = req.user.id;
    const { formationId } = req.params;
    const { deposit_id, order_index } = req.body;

    if (!deposit_id) {
      return res.status(422).json({ success: false, message: 'deposit_id requis' });
    }

    // Verifier la formation
    const formation = await db.prepare('SELECT * FROM formations WHERE id = ?').get(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation introuvable' });
    }

    // Verifier le depot
    const deposit = await db.prepare('SELECT * FROM module_deposits WHERE id = ?').get(deposit_id);
    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Depot introuvable' });
    }

    if (deposit.status === 'attached') {
      return res.status(400).json({ success: false, message: 'Ce depot est deja attache' });
    }

    const now = new Date().toISOString();
    const moduleId = uuidv4();

    // Determiner l'ordre
    let orderIndex = parseInt(order_index) || 0;
    if (orderIndex === 0) {
      const maxOrder = await db.prepare(
        'SELECT MAX(order_index) as m FROM modules WHERE formation_id = ?'
      ).get(formationId);
      orderIndex = (maxOrder && maxOrder.m) ? maxOrder.m + 1 : 1;
    }

    // Creer le module officiel
    db.prepare(`
      INSERT INTO modules (
        id, formation_id, trainer_id, title, description,
        hours, duration, order_index, start_date, end_date,
        pdf_path, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?)
    `).run(
      moduleId, formationId, deposit.trainer_id,
      deposit.title, deposit.description,
      deposit.hours || 0, deposit.hours || 0,
      orderIndex,
      deposit.start_date, deposit.end_date,
      deposit.pdf_path,
      directorId, now, now
    );

    // Marquer le depot comme attache
    await db.prepare(`
      UPDATE module_deposits
      SET status = 'attached',
          attached_to_module_id = ?,
          attached_at = ?,
          attached_by = ?,
          updated_at = ?
      WHERE id = ?
    `).run(moduleId, now, directorId, now, deposit_id);

    const module = await db.prepare('SELECT * FROM modules WHERE id = ?').get(moduleId);

    
    // ============================================================
    // NOTIFICATION POUR LE DIRECTEUR
    // ============================================================
    try {
      const { v4: uuidv4 } = require('uuid');
      const trainer = await db.prepare('SELECT full_name FROM users WHERE id = ?').get(trainerId);

      // Notifier tous les directeurs et admins
      const directors = await db.prepare("SELECT id FROM users WHERE role IN ('directeur', 'admin') AND is_active = '1'").all();
      const now = new Date().toISOString();

      directors.forEach(d => {
        try {
          db.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
            VALUES (?, ?, 'Nouveau module depose', ?, 'module_deposit', 0, '/director/modules', ?)
          `).run(
            uuidv4(),
            d.id,
            (trainer?.full_name || 'Un formateur') + ' a depose le module "' + title + '". A attacher a une formation.',
            now
          );
        } catch (e) { /* ignore */ }
      });
    } catch (e) { console.error('[deposit] notif error:', e); }

    return res.status(201).json({
      success: true,
      message: 'Module attache a la formation',
      data: module,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// DETACHER UN MODULE (directeur)
// ============================================================
exports.detachFromFormation = async (req, res, next) => {
  try {
    const { depositId } = req.params;

    const deposit = await db.prepare('SELECT * FROM module_deposits WHERE id = ?').get(depositId);
    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Depot introuvable' });
    }

    if (deposit.status !== 'attached') {
      return res.status(400).json({ success: false, message: 'Ce depot n est pas attache' });
    }

    const now = new Date().toISOString();

    // Supprimer le module officiel
    if (deposit.attached_to_module_id) {
      await db.prepare('DELETE FROM modules WHERE id = ?').run(deposit.attached_to_module_id);
    }

    // Remettre le depot en disponible
    await db.prepare(`
      UPDATE module_deposits
      SET status = 'available',
          attached_to_module_id = NULL,
          attached_at = NULL,
          attached_by = NULL,
          updated_at = ?
      WHERE id = ?
    `).run(now, depositId);

    return res.json({ success: true, message: 'Module detache' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// SUPPRIMER UN DEPOT (formateur)
// ============================================================
exports.deleteDeposit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trainerId = req.user.id;

    const deposit = await db.prepare('SELECT * FROM module_deposits WHERE id = ? AND trainer_id = ?').get(id, trainerId);
    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Depot introuvable' });
    }

    if (deposit.status === 'attached') {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer un depot attache' });
    }

    await db.prepare('DELETE FROM module_deposits WHERE id = ?').run(id);

    return res.json({ success: true, message: 'Depot supprime' });
  } catch (err) {
    next(err);
  }
};