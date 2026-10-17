// =============================================================
// ChefUnitPlus - Middleware d'authentification JWT
// =============================================================

const jwt = require('jsonwebtoken');

// =============================================================
// VERIFIER LE TOKEN
// =============================================================
exports.authenticate = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant',
        code: 'UNAUTHORIZED',
      });
    }

    const secret = process.env.JWT_SECRET || 'chefunitplus-secret-key-change-me-in-prod';
    const payload = jwt.verify(token, secret);

    // Compatibilite : remplir req.user ET req.userId/req.userRole
    req.user = {
      userId: payload.userId,
      id: payload.userId,
      role: payload.role,
    };
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Session expiree. Veuillez vous reconnecter.',
      code: 'UNAUTHORIZED',
    });
  }
};

// =============================================================
// VERIFIER LE ROLE
// =============================================================
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifie',
      });
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Acces non autorise',
      });
    }

    next();
  };
};


// =============================================================
// AUTH OPTIONNELLE : remplit req.user si token present
// Ne bloque pas si pas de token
// =============================================================
exports.optionalAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.substring(7) : null;

    if (token) {
      const jwt = require('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'chefunitplus_secret_key_change_me';
      const decoded = jwt.verify(token, jwtSecret);
      req.user = { id: decoded.userId || decoded.id, role: decoded.role };
    }
    next();
  } catch (e) {
    // Token invalide -> on continue sans req.user
    next();
  }
};
// =============================================================
// VERIFIER ADMIN
// =============================================================
exports.requireAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Reserve aux administrateurs',
    });
  }
  next();
};

// =============================================================
// VERIFIER DIRECTEUR
// =============================================================
exports.requireDirector = (req, res, next) => {
  if (req.userRole !== 'directeur' && req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Reserve aux directeurs',
    });
  }
  next();
};

// =============================================================
// VERIFIER FORMATEUR
// =============================================================
exports.requireTrainer = (req, res, next) => {
  if (req.userRole !== 'formateur' && req.userRole !== 'directeur' && req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Reserve aux formateurs',
    });
  }
  next();
};