// ChefUnitPlus - Routes admin (temporaires pour debug)
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Diagnostic : tester la creation de la table certificates
router.get('/fix-certificates', async (req, res) => {
  const result = { steps: [] };

  // Etape 1 : la table existe-t-elle ?
  try {
    const check = await db.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'certificates') as exists"
    );
    result.steps.push({ step: 'check', exists: check[0].exists });
  } catch (err) {
    result.steps.push({ step: 'check', error: err.message });
  }

  // Etape 2 : creer la table
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        formation_id TEXT,
        certificate_number TEXT UNIQUE,
        pdf_url TEXT,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);
    result.steps.push({ step: 'create', success: true });
  } catch (err) {
    result.steps.push({ step: 'create', error: err.message, code: err.code });
  }

  // Etape 3 : verifier a nouveau
  try {
    const check2 = await db.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'certificates') as exists"
    );
    result.steps.push({ step: 'verify', exists: check2[0].exists });
  } catch (err) {
    result.steps.push({ step: 'verify', error: err.message });
  }

  res.json(result);
});

// Lister toutes les tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    res.json({
      success: true,
      tables: tables.map(t => t.table_name),
      count: tables.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;