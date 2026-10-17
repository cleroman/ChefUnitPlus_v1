// ChefUnitPlus - Controleur ScoutGroup
const { v4: uuidv4 } = require('uuid');
const ScoutGroup = require('../models/ScoutGroup');
const User = require('../models/User');

// GET /api/scout-groups
async function list(req, res, next) {
  try {
    const groups = await ScoutGroup.listAll();
    return res.json({ success: true, data: groups });
  } catch (err) { next(err); }
}

// GET /api/scout-groups/:id
async function getById(req, res, next) {
  try {
    const group = await ScoutGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Groupe introuvable' });
    return res.json({ success: true, data: group });
  } catch (err) { next(err); }
}

// POST /api/scout-groups
async function create(req, res, next) {
  try {
    const { name, region, district, description } = req.body;
    if (!name) return res.status(422).json({ success: false, message: 'Nom requis' });

    const group = await ScoutGroup.create({
      id: uuidv4(),
      name,
      region,
      district,
      description,
      createdBy: req.user.id
    });

    return res.status(201).json({ success: true, message: 'Groupe cree', data: group });
  } catch (err) { next(err); }
}

// PATCH /api/scout-groups/:id
async function update(req, res, next) {
  try {
    const updated = await ScoutGroup.update(req.params.id, req.body);
    return res.json({ success: true, message: 'Groupe mis a jour', data: updated });
  } catch (err) { next(err); }
}

// DELETE /api/scout-groups/:id
async function remove(req, res, next) {
  try {
    await ScoutGroup.delete(req.params.id);
    return res.json({ success: true, message: 'Groupe supprime' });
  } catch (err) { next(err); }
}

// PATCH /api/scout-groups/:id/assign-director
async function assignDirector(req, res, next) {
  try {
    const { directorId } = req.body;
    if (!directorId) return res.status(422).json({ success: false, message: 'directorId requis' });

    const user = await User.findById(directorId);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

    const updated = await ScoutGroup.assignDirector(req.params.id, directorId);
    return res.json({ success: true, message: 'Directeur affecte', data: updated });
  } catch (err) { next(err); }
}


// ============================================================
// LISTER LES GROUPES PUBLICS (pour l'inscription)
// ============================================================
async function listPublic(req, res, next) {
  try {
    const groups = await ScoutGroup.listAll({ isActive: true });
    return res.json({ success: true, data: groups });
  } catch (err) { next(err); }
}

module.exports = {
  listPublic, list, getById, create, update, remove, assignDirector };