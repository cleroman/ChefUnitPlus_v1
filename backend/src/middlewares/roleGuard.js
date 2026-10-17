// ChefUnitPlus - Verification des roles
const { ROLE_LEVELS } = require('../config/constants');

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Non authentifie' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Acces non autorise' });
    }
    next();
  };
}

function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Non authentifie' });
    }
    const userLevel = ROLE_LEVELS[req.user.role] || 0;
    const required = ROLE_LEVELS[minRole] || 0;
    if (userLevel < required) {
      return res.status(403).json({ success: false, message: 'Niveau insuffisant' });
    }
    next();
  };
}

module.exports = { requireRole, requireMinRole };