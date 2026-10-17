// ChefUnitPlus - Constantes

const ROLES = {
  APPRENANT: 'apprenant',
  FORMATEUR: 'formateur',
  DIRECTEUR: 'directeur',
  ADMIN: 'admin'
};

const ROLE_LEVELS = {
  apprenant: 1,
  formateur: 2,
  directeur: 3,
  admin: 4
};

const ENROLLMENT_STATUS = {
  PENDING_PAYMENT: 'pendingPayment',
  PENDING_DIRECTOR: 'pendingDirector',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

module.exports = { ROLES, ROLE_LEVELS, ENROLLMENT_STATUS };