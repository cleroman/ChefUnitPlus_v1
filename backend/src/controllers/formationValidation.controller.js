const db = require('../config/database');

const MIN_DESC = 50;

async function canPublish(formation) {
  const errors = [];

  if (!formation.title || formation.title.trim().length === 0) {
    errors.push('Titre manquant');
  }
  if (!formation.description || formation.description.trim().length < MIN_DESC) {
    errors.push(`Description trop courte (min ${MIN_DESC} caracteres)`);
  }
  if(!formation.price || formation.price <= 0) {
    errors.push('Prix invalide');
  }
  if(!formation.start_date) {
    errors.push('Date de debut manquante');
  }
  if(!formation.end_date) {
    errors.push('Date de fin manquante');
  }
  if(formation.start_date && formation.end_date) {
    if (new Date(formation.end_date) <= new Date(formation.start_date)) {
      errors.push('Date de fin doit etre apres la date de debut');
    }
  }
  if(!formation.total_hours || formation.total_hours <= 0) {
    errors.push('Duree totale invalide');
  }

  if(!formation.trainer_id) {
    errors.push('Formateur non assigne');
  } else {
    const trainer = await db.prepare('SELECT id, role, full_name FROM users WHERE id = ?').get(formation.trainer_id);
    if(!trainer) {
      errors.push('Formateur introuvable');
    } else if (trainer.role !== 'formateur') {
      errors.push(`"${trainer.full_name}" n'a pas le role formateur`);
    }
  }

  const modules = await db.prepare('SELECT * FROM modules WHERE formation_id = ? ORDER BY order_index ASC').all(formation.id);
  if(modules.length === 0) {
    errors.push('Aucun module');
  } else {
    for (const m of modules) {
      if (!m.title) errors.push(`Module "${m.title || '?'}" : titre manquant`);
      if (!m.description) errors.push(`Module "${m.title}" : description manquante`);

      const lessons = await db.prepare('SELECT * FROM lessons WHERE module_id = ?').all(m.id);
      if (lessons.length === 0) {
        errors.push(`Module "${m.title}" : aucune lecon`);
      } else {
        const hasContent = lessons.some(l => l.pdf_url || l.video_url);
        if (!hasContent) errors.push(`Module "${m.title}" : aucune lecon PDF ou video`);
      }
    }
  }

  const totalChecks = 8 + (modules.length * 2);
  const progress = totalChecks > 0 ? Math.round(((totalChecks - errors.length) / totalChecks) * 100) : 0;

  return {
    canPublish: errors.length === 0,
    errors,
    progress: Math.max(0, Math.min(100, progress)),
    modulesCount: modules.length,
  };
}

exports.canPublish = async (req, res) => {
  try {
    const formation = await db.prepare('SELECT * FROM formations WHERE id = ?').get(req.params.id);
    if (!formation) return res.status(404).json({ success: false, message: 'Formation introuvable' });
    return res.json({ success: true, data: canPublish(formation) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.publish = async (req, res) => {
  try {
    const formation = await db.prepare('SELECT * FROM formations WHERE id = ?').get(req.params.id);
    if (!formation) return res.status(404).json({ success: false, message: 'Formation introuvable' });

    const result = canPublish(formation);
    if(!result.canPublish) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de publier : conditions non remplies',
        errors: result.errors,
      });
    }

    const now = new Date().toISOString();
    db.prepare(`UPDATE formations SET is_published = '1', status = ?, published_at = ?, published_by = ?, updated_at = ? WHERE id = ?`)
      .run('published', now, req.user.id, now, req.params.id);

    return res.json({
      success: true,
      message: 'Formation publiee',
      data: await db.prepare('SELECT * FROM formations WHERE id = ?').get(req.params.id),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.unpublish = async (req, res) => {
  try {
    const now = new Date().toISOString();
    db.prepare(`UPDATE formations SET is_published = '0', status = ?, published_at = NULL, updated_at = ? WHERE id = ?`)
      .run('draft', now, req.params.id);
    return res.json({
      success: true,
      message: 'Formation retiree',
      data: await db.prepare('SELECT * FROM formations WHERE id = ?').get(req.params.id),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = exports;