// ChefUnitPlus - Controleur Complaint
const { v4: uuidv4 } = require('uuid');
const Complaint = require('../models/Complaint');

// GET /api/complaints (admin)
async function list(req, res, next) {
  try {
    const { status } = req.query;
    const complaints = await Complaint.listAll({ status });
    return res.json({ success: true, data: complaints });
  } catch (err) { next(err); }
}

// GET /api/complaints/me (user)
async function listMine(req, res, next) {
  try {
    const complaints = Complaint.listByUser(req.user.id);
    return res.json({ success: true, data: complaints });
  } catch (err) { next(err); }
}

// GET /api/complaints/:id
async function getById(req, res, next) {
  try {
    const c = Complaint.findById(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Plainte introuvable' });
    return res.json({ success: true, data: c });
  } catch (err) { next(err); }
}

// POST /api/complaints
async function create(req, res, next) {
  try {
    const { subject, description, category, priority } = req.body;
    if (!subject || !description) {
      return res.status(422).json({ success: false, message: 'Sujet et description requis' });
    }

    const c = Complaint.create({
      id: uuidv4(),
      userId: req.user.id,
      subject,
      description,
      category,
      priority
    });

    return res.status(201).json({ success: true, message: 'Plainte enregistree', data: c });
  } catch (err) { next(err); }
}

// PATCH /api/complaints/:id/respond
async function respond(req, res, next) {
  try {
    const { adminResponse, status } = req.body;
    if (!adminResponse) {
      return res.status(422).json({ success: false, message: 'Reponse requise' });
    }

    const updated = Complaint.respond(req.params.id, {
      adminResponse,
      respondedBy: req.user.id,
      newStatus: status
    });

    return res.json({ success: true, message: 'Reponse enregistree', data: updated });
  } catch (err) { next(err); }
}

// PATCH /api/complaints/:id/close
async function close(req, res, next) {
  try {
    const updated = Complaint.close(req.params.id);
    return res.json({ success: true, message: 'Plainte fermee', data: updated });
  } catch (err) { next(err); }
}

module.exports = { list, listMine, getById, create, respond, close };