// =============================================================
// ChefUnitPlus - Backend : Inscription Scout complete
// =============================================================

const fs = require('fs');
const path = require('path');

const BASE = process.cwd();

console.log('');
console.log('===========================================================');
console.log('  ChefUnitPlus - Backend Scout Registration');
console.log('===========================================================');
console.log('');

function w(rel, content) {
    const full = path.join(BASE, rel);
    const dir = path.dirname(full);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
    console.log('  [+] ' + rel);
}

// =============================================================
// 1. MIGRATION SQL
// =============================================================
w('database/migrate_v3_scout.js', `// =============================================================
// ChefUnitPlus - Migration v3 : Inscription Scout complete
// =============================================================

const db = require('../src/config/database');

console.log('Migration v3 : ajout des champs scout...');
console.log('');

// --- 1. Etendre la table users ---
const userColumns = [
    ['post_nom', 'TEXT'],
    ['prenom', 'TEXT'],
    ['sexe', 'TEXT'],
    ['date_naissance', 'DATE'],
    ['lieu_naissance', 'TEXT'],
    ['photo_url', 'TEXT'],
];

const existingUserCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);

for (const [name, type] of userColumns) {
    if (!existingUserCols.includes(name)) {
        db.exec('ALTER TABLE users ADD COLUMN ' + name + ' ' + type);
        console.log('  + users.' + name);
    }
}

// --- 2. Etendre la table user_details ---
const detailColumns = [
    ['province', 'TEXT'],
    ['commune', 'TEXT'],
    ['quartier', 'TEXT'],
    ['avenue', 'TEXT'],
    ['numero', 'TEXT'],
    ['groupe_scout', 'TEXT'],
    ['numero_affiliation', 'TEXT'],
    ['district', 'TEXT'],
    ['association', 'TEXT'],
    ['profession', 'TEXT'],
    ['branche', 'TEXT'],
    ['date_entree_scout', 'DATE'],
    ['fonction_scout', 'TEXT'],
    ['antecedents_medicaux', 'TEXT'],
    ['attestation_camp_url', 'TEXT'],
    ['engagement_accepte', 'INTEGER DEFAULT 0'],
    ['engagement_date', 'DATETIME'],
];

const existingDetailCols = db.prepare('PRAGMA table_info(user_details)').all().map(c => c.name);

for (const [name, type] of detailColumns) {
    if (!existingDetailCols.includes(name)) {
        db.exec('ALTER TABLE user_details ADD COLUMN ' + name + ' ' + type);
        console.log('  + user_details.' + name);
    }
}

// --- 3. Nouvelle table scout_camps ---
db.exec(\`
  CREATE TABLE IF NOT EXISTS scout_camps (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    nom_camp TEXT NOT NULL,
    annee INTEGER,
    lieu TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
\`);
console.log('  + table scout_camps');

// --- 4. Nouvelle table emergency_contacts ---
db.exec(\`
  CREATE TABLE IF NOT EXISTS emergency_contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    post_nom TEXT,
    prenom TEXT,
    telephone TEXT NOT NULL,
    adresse TEXT,
    relation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
\`);
console.log('  + table emergency_contacts');

console.log('');
console.log('Migration v3 terminee avec succes !');
`);

// =============================================================
// 2. MODEL User (mis a jour)
// =============================================================
w('src/models/User.js', `// =============================================================
// ChefUnitPlus - Modele User (etendu Scout)
// =============================================================

const db = require('../config/database');

const User = {
  findById(id) {
    return db.prepare(\`
      SELECT id, full_name, post_nom, prenom, email, phone, sexe,
             date_naissance, lieu_naissance, photo_url,
             role, is_active, created_at
      FROM users WHERE id = ?
    \`).get(id);
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  create(data) {
    const {
      id, fullName, postNom, prenom, email, phone,
      sexe, dateNaissance, lieuNaissance,
      passwordHash, role = 'apprenant'
    } = data;

    db.prepare(\`
      INSERT INTO users (
        id, full_name, post_nom, prenom, email, phone,
        sexe, date_naissance, lieu_naissance,
        password_hash, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(
      id, fullName, postNom || null, prenom || null, email, phone,
      sexe || null, dateNaissance || null, lieuNaissance || null,
      passwordHash, role
    );

    return this.findById(id);
  },

  updateProfile(id, fields) {
    const allowed = [
      'full_name', 'post_nom', 'prenom', 'phone', 'sexe',
      'date_naissance', 'lieu_naissance', 'photo_url', 'avatar_url'
    ];
    const updates = [];
    const values = [];

    Object.entries(fields).forEach(([k, v]) => {
      if (allowed.includes(k) && v !== undefined) {
        updates.push(k + ' = ?');
        values.push(v);
      }
    });

    if (updates.length === 0) return this.findById(id);
    values.push(id);
    db.prepare('UPDATE users SET ' + updates.join(', ') + ' WHERE id = ?').run(...values);
    return this.findById(id);
  },

  updateRole(id, role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    return this.findById(id);
  },

  toggleActive(id, isActive) {
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
    return this.findById(id);
  },

  listAll({ role = null } = {}) {
    if (role) {
      return db.prepare(
        'SELECT id, full_name, post_nom, prenom, email, phone, sexe, role, is_active, created_at FROM users WHERE role = ? ORDER BY created_at DESC'
      ).all(role);
    }
    return db.prepare(
      'SELECT id, full_name, post_nom, prenom, email, phone, sexe, role, is_active, created_at FROM users ORDER BY created_at DESC'
    ).all();
  },

  delete(id) {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },
};

module.exports = User;
`);

// =============================================================
// 3. MODEL UserDetails (etendu Scout)
// =============================================================
w('src/models/UserDetails.js', `// =============================================================
// ChefUnitPlus - Modele UserDetails (etendu Scout)
// =============================================================

const db = require('../config/database');

const UserDetails = {
  findByUserId(userId) {
    return db.prepare('SELECT * FROM user_details WHERE user_id = ?').get(userId);
  },

  upsert(userId, fields) {
    const existing = this.findByUserId(userId);
    const allowed = [
      'address', 'city', 'country', 'birth_date',
      'education_level', 'education_field', 'education_institution',
      'scout_formation', 'scout_role', 'group_id', 'bio',
      'province', 'commune', 'quartier', 'avenue', 'numero',
      'groupe_scout', 'numero_affiliation', 'district', 'association',
      'profession', 'branche', 'date_entree_scout', 'fonction_scout',
      'antecedents_medicaux', 'attestation_camp_url',
      'engagement_accepte', 'engagement_date',
    ];

    if (!existing) {
      const keys = ['user_id'];
      const placeholders = ['?'];
      const values = [userId];

      Object.entries(fields).forEach(([k, v]) => {
        if (allowed.includes(k) && v !== undefined) {
          keys.push(k);
          placeholders.push('?');
          values.push(v);
        }
      });

      db.prepare(
        'INSERT INTO user_details (' + keys.join(', ') + ') VALUES (' + placeholders.join(', ') + ')'
      ).run(...values);

      return this.findByUserId(userId);
    }

    const updates = [];
    const values = [];
    Object.entries(fields).forEach(([k, v]) => {
      if (allowed.includes(k) && v !== undefined) {
        updates.push(k + ' = ?');
        values.push(v);
      }
    });

    if (updates.length === 0) return existing;
    values.push(userId);
    db.prepare('UPDATE user_details SET ' + updates.join(', ') + ' WHERE user_id = ?').run(...values);
    return this.findByUserId(userId);
  },

  getFullProfile(userId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return null;

    const details = this.findByUserId(userId);
    const camps = db.prepare('SELECT * FROM scout_camps WHERE user_id = ? ORDER BY annee DESC').all(userId);
    const emergencies = db.prepare('SELECT * FROM emergency_contacts WHERE user_id = ?').all(userId);
    const enrollments = db.prepare('SELECT * FROM enrollments WHERE learner_id = ?').all(userId);
    const certificates = db.prepare('SELECT * FROM certificates WHERE user_id = ?').all(userId);

    delete user.password_hash;

    return {
      user,
      details: details || {},
      camps,
      emergencyContacts: emergencies,
      enrollments,
      certificates
    };
  }
};

module.exports = UserDetails;
`);

// =============================================================
// 4. MODEL ScoutCamp
// =============================================================
w('src/models/ScoutCamp.js', `// ChefUnitPlus - Modele ScoutCamp
const db = require('../config/database');

const ScoutCamp = {
  listByUser(userId) {
    return db.prepare('SELECT * FROM scout_camps WHERE user_id = ? ORDER BY annee DESC').all(userId);
  },

  create({ id, userId, nomCamp, annee, lieu, description }) {
    db.prepare(
      'INSERT INTO scout_camps (id, user_id, nom_camp, annee, lieu, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, userId, nomCamp, annee || null, lieu || null, description || null);
    return db.prepare('SELECT * FROM scout_camps WHERE id = ?').get(id);
  },

  deleteByUser(userId) {
    db.prepare('DELETE FROM scout_camps WHERE user_id = ?').run(userId);
  },
};

module.exports = ScoutCamp;
`);

// =============================================================
// 5. MODEL EmergencyContact
// =============================================================
w('src/models/EmergencyContact.js', `// ChefUnitPlus - Modele EmergencyContact
const db = require('../config/database');

const EmergencyContact = {
  listByUser(userId) {
    return db.prepare('SELECT * FROM emergency_contacts WHERE user_id = ?').all(userId);
  },

  create({ id, userId, nom, postNom, prenom, telephone, adresse, relation }) {
    db.prepare(
      'INSERT INTO emergency_contacts (id, user_id, nom, post_nom, prenom, telephone, adresse, relation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, userId, nom, postNom || null, prenom || null, telephone, adresse || null, relation || null);
    return db.prepare('SELECT * FROM emergency_contacts WHERE id = ?').get(id);
  },

  deleteByUser(userId) {
    db.prepare('DELETE FROM emergency_contacts WHERE user_id = ?').run(userId);
  },
};

module.exports = EmergencyContact;
`);

// =============================================================
// 6. CONTROLLER auth (register + login etendus)
// =============================================================
w('src/controllers/auth.controller.js', `// =============================================================
// ChefUnitPlus - Controleur Auth (register Scout etendu)
// =============================================================

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');

const User = require('../models/User');
const UserDetails = require('../models/UserDetails');
const ScoutCamp = require('../models/ScoutCamp');
const EmergencyContact = require('../models/EmergencyContact');
const { generateToken } = require('../utils/jwt');

// ===========================================================
// POST /api/auth/register - Inscription complete
// ===========================================================
async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Donnees invalides',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const body = req.body;

    // --- Verification email unique ---
    const existing = User.findByEmail(body.email);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est deja utilise',
        code: 'CONFLICT'
      });
    }

    // --- Hachage mot de passe ---
    const passwordHash = await bcrypt.hash(body.password, 10);
    const userId = uuidv4();

    // --- Nom complet a partir de nom + post-nom + prenom ---
    const fullName = [body.nom, body.postNom, body.prenom]
      .filter(x => x && x.trim())
      .join(' ');

    // --- 1. Creer l'utilisateur ---
    const user = User.create({
      id: userId,
      fullName: fullName,
      postNom: body.postNom,
      prenom: body.prenom,
      email: body.email,
      phone: body.phone,
      sexe: body.sexe,
      dateNaissance: body.dateNaissance,
      lieuNaissance: body.lieuNaissance,
      passwordHash: passwordHash,
      role: 'apprenant'
    });

    // --- 2. Creer les details etendus ---
    UserDetails.upsert(userId, {
      address: body.address || null,
      city: body.ville || null,
      country: body.pays || 'RDC',
      birth_date: body.dateNaissance,
      education_level: body.niveauEtude,
      education_field: null,
      education_institution: null,
      province: body.province,
      commune: body.commune,
      quartier: body.quartier,
      avenue: body.avenue,
      numero: body.numero,
      groupe_scout: body.groupeScout,
      numero_affiliation: body.numeroAffiliation,
      district: body.district,
      association: body.association,
      profession: body.profession,
      branche: body.branche,
      date_entree_scout: body.dateEntreeScout,
      fonction_scout: body.fonction,
      antecedents_medicaux: body.antecedentsMedicaux,
      attestation_camp_url: body.attestationCampUrl,
      engagement_accepte: body.engagementAccepte ? 1 : 0,
      engagement_date: body.engagementAccepte ? new Date().toISOString() : null,
    });

    // --- 3. Creer les camps de formation ---
    if (Array.isArray(body.camps) && body.camps.length > 0) {
      for (const camp of body.camps) {
        if (camp.nomCamp && camp.nomCamp.trim()) {
          ScoutCamp.create({
            id: uuidv4(),
            userId: userId,
            nomCamp: camp.nomCamp,
            annee: camp.annee,
            lieu: camp.lieu,
            description: camp.description
          });
        }
      }
    }

    // --- 4. Creer les contacts d'urgence ---
    if (Array.isArray(body.emergencyContacts) && body.emergencyContacts.length > 0) {
      for (const contact of body.emergencyContacts) {
        if (contact.nom && contact.telephone) {
          EmergencyContact.create({
            id: uuidv4(),
            userId: userId,
            nom: contact.nom,
            postNom: contact.postNom,
            prenom: contact.prenom,
            telephone: contact.telephone,
            adresse: contact.adresse,
            relation: contact.relation
          });
        }
      }
    }

    // --- 5. Token JWT ---
    const token = generateToken({ userId: user.id, role: user.role });

    return res.status(201).json({
      success: true,
      message: 'Inscription reussie',
      user: {
        id: user.id,
        fullName: user.full_name,
        postNom: user.post_nom,
        prenom: user.prenom,
        email: user.email,
        phone: user.phone,
        sexe: user.sexe,
        role: user.role,
        isActive: !!user.is_active
      },
      token
    });
  } catch (err) {
    next(err);
  }
}

// ===========================================================
// POST /api/auth/login
// ===========================================================
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
        code: 'UNAUTHORIZED'
      });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
        code: 'UNAUTHORIZED'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est suspendu',
        code: 'FORBIDDEN'
      });
    }

    const token = generateToken({ userId: user.id, role: user.role });

    return res.status(200).json({
      success: true,
      message: 'Connexion reussie',
      user: {
        id: user.id,
        fullName: user.full_name,
        postNom: user.post_nom,
        prenom: user.prenom,
        email: user.email,
        phone: user.phone,
        sexe: user.sexe,
        role: user.role,
        isActive: !!user.is_active
      },
      token
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  return res.status(200).json({ success: true, message: 'Deconnexion reussie' });
}

function me(req, res) {
  return res.status(200).json({ success: true, user: req.user });
}

module.exports = { register, login, logout, me };
`);

// =============================================================
// 7. CONTROLLER user (profil complet)
// =============================================================
w('src/controllers/user.controller.js', `// =============================================================
// ChefUnitPlus - Controleur User (etendu Scout)
// =============================================================

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const UserDetails = require('../models/UserDetails');
const ScoutCamp = require('../models/ScoutCamp');
const EmergencyContact = require('../models/EmergencyContact');
const db = require('../config/database');

// GET /api/users
function list(req, res, next) {
  try {
    const users = User.listAll({ role: req.query.role });
    return res.json({ success: true, data: users });
  } catch (err) { next(err); }
}

// GET /api/users/:id
function getById(req, res, next) {
  try {
    const user = User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    return res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

// GET /api/users/:id/full-profile
function getFullProfile(req, res, next) {
  try {
    const profile = UserDetails.getFullProfile(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    return res.json({ success: true, data: profile });
  } catch (err) { next(err); }
}

// PATCH /api/users/:id/details
function updateDetails(req, res, next) {
  try {
    const details = UserDetails.upsert(req.params.id, req.body);
    return res.json({ success: true, message: 'Details mis a jour', data: details });
  } catch (err) { next(err); }
}

// PATCH /api/users/me - Modifier profil
function updateProfile(req, res, next) {
  try {
    const updated = User.updateProfile(req.user.id, req.body);

    // Mettre a jour les details si fournis
    if (req.body.details) {
      UserDetails.upsert(req.user.id, req.body.details);
    }

    return res.json({ success: true, message: 'Profil mis a jour', data: updated });
  } catch (err) { next(err); }
}

// PATCH /api/users/:id/promote
function promote(req, res, next) {
  try {
    const { role } = req.body;
    if (!['apprenant', 'formateur', 'directeur', 'admin'].includes(role)) {
      return res.status(422).json({ success: false, message: 'Role invalide' });
    }
    const updated = User.updateRole(req.params.id, role);
    return res.json({ success: true, message: 'Role mis a jour', data: updated });
  } catch (err) { next(err); }
}

// PATCH /api/users/:id/suspend
function suspend(req, res, next) {
  try {
    const updated = User.toggleActive(req.params.id, false);
    return res.json({ success: true, message: 'Utilisateur suspendu', data: updated });
  } catch (err) { next(err); }
}

// PATCH /api/users/:id/reactivate
function reactivate(req, res, next) {
  try {
    const updated = User.toggleActive(req.params.id, true);
    return res.json({ success: true, message: 'Utilisateur reactive', data: updated });
  } catch (err) { next(err); }
}

// PATCH /api/users/:id/reset-password
async function resetPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(422).json({ success: false, message: 'Mot de passe trop court (min 6)' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
    return res.json({ success: true, message: 'Mot de passe reinitialise' });
  } catch (err) { next(err); }
}

// DELETE /api/users/:id
function remove(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(422).json({ success: false, message: 'Impossible de se supprimer soi-meme' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    return res.json({ success: true, message: 'Utilisateur supprime' });
  } catch (err) { next(err); }
}

module.exports = {
  list, getById, getFullProfile, updateDetails, updateProfile,
  promote, suspend, reactivate, resetPassword, remove
};
`);

// =============================================================
// 8. ROUTES user (ajout /me)
// =============================================================
w('src/routes/user.routes.js', `// ChefUnitPlus - Routes users
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth');
const { requireRole, requireMinRole } = require('../middlewares/roleGuard');

router.use(authenticate);

// Profil personnel (tous)
router.patch('/me', ctrl.updateProfile);
router.get('/me', ctrl.getById);

// Voir un utilisateur
router.get('/:id', ctrl.getById);
router.get('/:id/full-profile', ctrl.getFullProfile);
router.patch('/:id/details', ctrl.updateDetails);

// Directeur+
router.get('/', requireMinRole('directeur'), ctrl.list);
router.patch('/:id/promote', requireMinRole('directeur'), ctrl.promote);

// Admin
router.patch('/:id/suspend', requireRole('admin'), ctrl.suspend);
router.patch('/:id/reactivate', requireRole('admin'), ctrl.reactivate);
router.patch('/:id/reset-password', requireRole('admin'), ctrl.resetPassword);
router.delete('/:id', requireRole('admin'), ctrl.remove);

module.exports = router;
`);

// =============================================================
// 9. VALIDATORS (register etendu)
// =============================================================
w('src/utils/validators.js', `// ChefUnitPlus - Validateurs
const { body } = require('express-validator');

const registerValidator = [
  body('nom').trim().isLength({ min: 2 }).withMessage('Nom requis (min 2)'),
  body('postNom').trim().isLength({ min: 2 }).withMessage('Post-nom requis'),
  body('prenom').trim().isLength({ min: 2 }).withMessage('Prenom requis'),
  body('email').trim().isEmail().withMessage('Email invalide'),
  body('phone').trim().notEmpty().withMessage('Telephone requis'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe min 6'),
  body('sexe').isIn(['homme', 'femme']).withMessage('Sexe invalide'),
  body('dateNaissance').notEmpty().withMessage('Date de naissance requise'),
  body('lieuNaissance').trim().notEmpty().withMessage('Lieu de naissance requis'),
  body('province').trim().notEmpty().withMessage('Province requise'),
  body('ville').trim().notEmpty().withMessage('Ville requise'),
  body('commune').trim().notEmpty().withMessage('Commune requise'),
  body('quartier').trim().notEmpty().withMessage('Quartier requis'),
  body('avenue').trim().notEmpty().withMessage('Avenue requise'),
  body('numero').trim().notEmpty().withMessage('Numero requis'),
  body('groupeScout').trim().notEmpty().withMessage('Groupe scout requis'),
  body('branche').isIn(['meute', 'troupe', 'compagnie', 'clan'])
    .withMessage('Branche invalide'),
  body('dateEntreeScout').notEmpty().withMessage('Date entree scout requise'),
  body('engagementAccepte').isBoolean().withMessage('Engagement requis'),
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

module.exports = { registerValidator, loginValidator };
`);

console.log('');
console.log('===========================================================');
console.log('  BACKEND PRET !');
console.log('===========================================================');
console.log('');
console.log('Etape suivante :');
console.log('  1. node database/migrate_v3_scout.js');
console.log('  2. npm run dev');
console.log('');