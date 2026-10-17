// ChefUnitPlus - Gestion des erreurs

function errorHandler(err, req, res, next) {
  // Erreur de parsing JSON (body malformÃƒÂ©)
  if (err.type === 'entity.parse.failed') {
    console.error('[JSON ERROR]', err.message);
    return res.status(400).json({
      success: false,
      message: 'Corps JSON invalide',
      code: 'INVALID_JSON',
    });
  }

  // Erreur avec statusCode
  if (err.statusCode) {
    console.error('[ERROR]', err.message);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code || null,
    });
  }

  // Erreur gÃƒÂ©nÃƒÂ©rique
  console.error('[ERROR]', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  res.status(500).json({
    success: false,
    message: 'Erreur serveur',
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'Route introuvable : ' + req.method + ' ' + req.originalUrl,
  });
}

class AppError extends Error {
  constructor(message, statusCode = 400, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = { errorHandler, notFoundHandler, AppError };