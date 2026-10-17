// ChefUnitPlus - JWT
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'change-me';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = { generateToken, verifyToken };