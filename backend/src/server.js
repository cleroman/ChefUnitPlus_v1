// ChefUnitPlus - Point d'entree du serveur
require('dotenv').config();

const app = require('./app');
const db = require('./config/database');
const { ensureSchema } = require('./config/ensureSchema');

const PORT = process.env.PORT || 3000;

// =============================================================
// Demarrage ASYNC : on cree les tables AVANT d'ecouter
// =============================================================
async function start() {
  try {
    // Test connexion
    await db.query('SELECT 1');
    console.log('Base de donnees connectee');

    // Auto-creation des tables (idempotent)
    await ensureSchema();

    // Demarrage du serveur
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('===========================================================');
      console.log('  ChefUnitPlus Backend');
      console.log('===========================================================');
      console.log('  URL    : http://localhost:' + PORT);
      console.log('  API    : http://localhost:' + PORT + '/api');
      console.log('  Health : http://localhost:' + PORT + '/api/health');
      console.log('===========================================================');
      console.log('');
    });
  } catch (err) {
    console.error('Erreur au demarrage :', err.message);
    process.exit(1);
  }
}

start();