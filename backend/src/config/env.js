// =============================================================
// ChefUnitPlus - Config env
// Variables d'environnement avec valeurs par defaut
// =============================================================

require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'chefunitplus-secret-key-change-me-in-prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',

  // Base de donnees
  DB_PATH: process.env.DB_PATH || './database/chefunitplus.db',

  // Uploads
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',

  // FlexPaie (paiement)
  FLEXPAIE_API_KEY: process.env.FLEXPAIE_API_KEY || '',
  FLEXPAIE_API_URL: process.env.FLEXPAIE_API_URL || '',
};