// =============================================================
// ChefUnitPlus - Modele UserDetails (etendu Scout)
// =============================================================

const db = require('../config/database');

const UserDetails = {
  async findByUserId(userId) {
    return await db.prepare('SELECT * FROM user_details WHERE user_id = ?').get(userId);
  },

  async upsert(userId, fields) {
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

    if(!existing) {
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

  async getFullProfile(userId) {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return null;

    const details = await this.findByUserId(userId);

    // Requetes avec gestion d'erreur (tables optionnelles)
    let camps = [];
    let emergencies = [];
    let enrollments = [];
    let certificates = [];

    try {
      camps = await db.prepare('SELECT * FROM scout_camps WHERE user_id = ? ORDER BY annee DESC').all(userId);
    } catch (e) {
      console.warn('[getFullProfile] Table scout_camps introuvable:', e.message);
    }

    try {
      emergencies = await db.prepare('SELECT * FROM emergency_contacts WHERE user_id = ?').all(userId);
    } catch (e) {
      console.warn('[getFullProfile] Table emergency_contacts introuvable:', e.message);
    }

    try {
      enrollments = await db.prepare('SELECT * FROM enrollments WHERE learner_id = ?').all(userId);
    } catch (e) {
      console.warn('[getFullProfile] Table enrollments introuvable:', e.message);
    }

    try {
      certificates = await db.prepare('SELECT * FROM certificates WHERE user_id = ?').all(userId);
    } catch (e) {
      console.warn('[getFullProfile] Table certificates introuvable:', e.message);
    }

    delete user.password_hash;

    return {
      user,
      details: details || {},
      camps: camps || [],
      emergencyContacts: emergencies || [],
      enrollments: enrollments || [],
      certificates: certificates || []
    };
  }
};

module.exports = UserDetails;
