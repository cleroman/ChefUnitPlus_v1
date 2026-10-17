// =============================================================
// ChefUnitPlus - Type Converter
// Convertit les types text PostgreSQL en types natifs JS
// =============================================================

function toNumber(value, defaultValue = 0) {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function toInt(value, defaultValue = 0) {
  return Math.round(toNumber(value, defaultValue));
}

function toBool(value, defaultValue = false) {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    return value === '1' || value.toLowerCase() === 'true';
  }
  return defaultValue;
}

// Convertit un objet enrollment
function normalizeEnrollment(e) {
  if (!e) return e;
  return {
    ...e,
    amount_paid: toNumber(e.amount_paid),
    progress_percent: toInt(e.progress_percent),
  };
}

// Convertit un objet formation
function normalizeFormation(f) {
  if (!f) return f;
  return {
    ...f,
    price: toNumber(f.price),
    is_published: toInt(f.is_published),
    enrolled_count: toInt(f.enrolled_count),
    module_count: toInt(f.module_count),
    total_hours: toNumber(f.total_hours),
    max_participants: toInt(f.max_participants),
  };
}

// Convertit un objet module
function normalizeModule(m) {
  if (!m) return m;
  return {
    ...m,
    hours: toNumber(m.hours),
    order_index: toInt(m.order_index),
  };
}

// Convertit un objet user
function normalizeUser(u) {
  if (!u) return u;
  return {
    ...u,
    is_active: toInt(u.is_active),
  };
}

module.exports = {
  toNumber,
  toInt,
  toBool,
  normalizeEnrollment,
  normalizeFormation,
  normalizeModule,
  normalizeUser,
};