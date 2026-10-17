// ChefUnitPlus - Configuration Express
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { requestLogger } = require('./middlewares/logger');

const routes = require('./routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ============================================================
// FICHIERS STATIQUES (uploads)
// ============================================================
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ============================================================
// 1. API ROUTES
// ============================================================
app.use('/api', routes);

// ============================================================
// 2. FLUTTER WEB - Serve static files (AVANT notFoundHandler)
// ============================================================
const flutterWebPath = path.join(__dirname, '..', 'public');

// Sert les fichiers statiques (main.dart.js, assets/, index.html, etc.)
app.use(express.static(flutterWebPath));

// Fallback : renvoie index.html pour toute route non-API
app.get(/^(?!\/api).*/, (req, res, next) => {
  const indexPath = path.join(flutterWebPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return next();
});

// ============================================================
// 3. 404 ET ERREURS (EN DERNIER)
// ============================================================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;