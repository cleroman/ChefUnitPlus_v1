// =============================================================
// ChefUnitPlus - Payment Numbers Controller
// Gere les numeros de reception Mobile Money
// =============================================================
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// ============================================================
// OPERATEURS ET FORMATS
// ============================================================
const OPERATORS = {
  airtel: {
    name: 'Airtel Money',
    prefix: ['099', '097'],
    format: '099 XXX XXXX',
    reference_pattern: 'MPXXXXXXXX',
    reference_regex: /^MP\d{8}$/,
    reference_length: 10,
    reference_example: 'MP2409211234',
    reference_description: 'MP suivi de 8 chiffres',
  },
  vodacom: {
    name: 'Vodacom M-Pesa',
    prefix: ['081', '082', '083'],
    format: '081 XXX XXXX',
    reference_pattern: 'MPXXXXXXXX',
    reference_regex: /^MP\d{8}$/,
    reference_length: 10,
    reference_example: 'MP2409215678',
    reference_description: 'MP suivi de 8 chiffres',
  },
  orange: {
    name: 'Orange Money',
    prefix: ['089', '084', '085'],
    format: '089 XXX XXXX',
    reference_pattern: 'OMXXXXXXXX',
    reference_regex: /^OM\d{8}$/,
    reference_length: 10,
    reference_example: 'OM2409219012',
    reference_description: 'OM suivi de 8 chiffres',
  },
  africell: {
    name: 'Africell Money',
    prefix: ['090', '091'],
    format: '090 XXX XXXX',
    reference_pattern: 'AFXXXXXXXX',
    reference_regex: /^AF\d{8}$/,
    reference_length: 10,
    reference_example: 'AF2409213456',
    reference_description: 'AF suivi de 8 chiffres',
  },
};

// ============================================================
// LIST
// ============================================================
exports.list = async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM payment_numbers ORDER BY operator, display_name').all();
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// LIST ACTIVE
// ============================================================
exports.listActive = async (req, res) => {
  try {
    const rows = await db.prepare(`SELECT * FROM payment_numbers WHERE is_active = '1' ORDER BY operator, display_name`).all();
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
    const row = await db.prepare('SELECT * FROM payment_numbers WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Numero introuvable' });
    return res.json({ success: true, data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GET OPERATORS
// ============================================================
exports.getOperators = async (req, res) => {
  try {
    const list = Object.entries(OPERATORS).map(([key, val]) => ({
      key,
      name: val.name,
      prefix: val.prefix,
      format: val.format,
      reference_pattern: val.reference_pattern,
      reference_length: val.reference_length,
      reference_example: val.reference_example,
      reference_description: val.reference_description,
    }));
    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// CREATE
// ============================================================
exports.create = async (req, res) => {
  try {
    const { operator, display_name, phone_number, reference_format } = req.body;

    if (!operator || !OPERATORS[operator]) {
      return res.status(400).json({ success: false, message: 'Operateur invalide' });
    }
    if (!display_name || display_name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Nom affiche invalide' });
    }
    if (!phone_number) {
      return res.status(400).json({ success: false, message: 'Numero invalide' });
    }

    const normalized = phone_number.replace(/\s/g, '');
    const opInfo = OPERATORS[operator];

    const validPrefix = opInfo.prefix.some(p => normalized.startsWith(p));
    if (!validPrefix) {
      return res.status(400).json({
        success: false,
        message: `Le numero doit commencer par ${opInfo.prefix.join(', ')} pour ${opInfo.name}`,
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO payment_numbers (id, operator, display_name, phone_number, reference_format, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, operator, display_name.trim(), normalized, reference_format || opInfo.format, now, now);

    const row = await db.prepare('SELECT * FROM payment_numbers WHERE id = ?').get(id);
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// UPDATE
// ============================================================
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { operator, display_name, phone_number, reference_format, is_active } = req.body;

    const existing = await db.prepare('SELECT * FROM payment_numbers WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Numero introuvable' });

    const updates = [];
    const params = [];

    if (operator !== undefined) {
      if (!OPERATORS[operator]) return res.status(400).json({ success: false, message: 'Operateur invalide' });
      updates.push('operator = ?');
      params.push(operator);
    }
    if (display_name !== undefined) { updates.push('display_name = ?'); params.push(display_name.trim()); }
    if (phone_number !== undefined) {
      const normalized = phone_number.replace(/\s/g, '');
      updates.push('phone_number = ?');
      params.push(normalized);
    }
    if (reference_format !== undefined) { updates.push('reference_format = ?'); params.push(reference_format); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    db.prepare(`UPDATE payment_numbers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const row = await db.prepare('SELECT * FROM payment_numbers WHERE id = ?').get(id);
    return res.json({ success: true, data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// DELETE
// ============================================================
exports.remove = async (req, res) => {
  try {
    await db.prepare('DELETE FROM payment_numbers WHERE id = ?').run(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// VALIDATE REFERENCE
// ============================================================
exports.validateReference = async (req, res) => {
  try {
    const { operator, reference_number } = req.body;

    if (!operator || !OPERATORS[operator]) {
      return res.status(400).json({ success: false, message: 'Operateur invalide' });
    }
    if (!reference_number) {
      return res.status(400).json({ success: false, message: 'Numero de reference manquant' });
    }

    const opInfo = OPERATORS[operator];
    const normalized = reference_number.replace(/\s/g, '').toUpperCase();

    if (!opInfo.reference_regex.test(normalized)) {
      return res.status(400).json({
        success: false,
        message: `Format invalide pour ${opInfo.name}. Format attendu : ${opInfo.reference_description}. Exemple : ${opInfo.reference_example}`,
        expected: {
          pattern: opInfo.reference_pattern,
          length: opInfo.reference_length,
          example: opInfo.reference_example,
          description: opInfo.reference_description,
        },
      });
    }

    return res.json({
      success: true,
      message: 'Numero de reference valide',
      data: { operator, reference_number: normalized, operator_name: opInfo.name },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = exports;