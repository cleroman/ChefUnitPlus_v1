const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

const MIN_DESC = 50;

console.log('');
console.log('========================================');
console.log(' ANALYSE DES FORMATIONS');
console.log('========================================');

const formations = db.prepare('SELECT * FROM formations ORDER BY created_at DESC').all();

console.log('');
console.log(`Total : ${formations.length} formation(s)`);
console.log('');

let complete = 0;
let incomplete = 0;
const toLock = [];

formations.forEach((f, idx) => {
  const errors = [];

  // 1. Titre
  if (!f.title || f.title.trim().length === 0) {
    errors.push('Titre manquant');
  }

  // 2. Description
  if (!f.description || f.description.trim().length < MIN_DESC) {
    errors.push(`Description trop courte (${(f.description || '').length}/${MIN_DESC} caracteres)`);
  }

  // 3. Prix
  if (!f.price || f.price <= 0) {
    errors.push(`Prix invalide (${f.price || 0})`);
  }

  // 4. Dates
  if (!f.start_date) {
    errors.push('Date de debut manquante');
  }
  if (!f.end_date) {
    errors.push('Date de fin manquante');
  }
  if (f.start_date && f.end_date) {
    if (new Date(f.end_date) <= new Date(f.start_date)) {
      errors.push('Date de fin doit etre apres la date de debut');
    }
  }

  // 5. Duree
  if (!f.total_hours || f.total_hours <= 0) {
    errors.push(`Duree totale invalide (${f.total_hours || 0}h)`);
  }

  // 6. Formateur
  let trainerName = '(non assigne)';
  if (!f.trainer_id) {
    errors.push('Formateur non assigne');
  } else {
    const trainer = db.prepare('SELECT full_name, role FROM users WHERE id = ?').get(f.trainer_id);
    if (!trainer) {
      errors.push('Formateur introuvable');
    } else {
      trainerName = trainer.full_name;
      if (trainer.role !== 'formateur') {
        errors.push(`"${trainer.full_name}" n'est pas formateur (role: ${trainer.role})`);
      }
    }
  }

  // 7. Modules
  const modules = db.prepare('SELECT * FROM modules WHERE formation_id = ?').all(f.id);
  if (modules.length === 0) {
    errors.push('Aucun module');
  } else {
    modules.forEach((m, i) => {
      if (!m.title) errors.push(`Module ${i+1} : titre manquant`);
      if (!m.description) errors.push(`Module ${i+1} : description manquante`);

      // 8. Lecons PDF/video
      const lessons = db.prepare('SELECT * FROM lessons WHERE module_id = ?').all(m.id);
      if (lessons.length === 0) {
        errors.push(`Module "${m.title}" : aucune lecon`);
      } else {
        const hasPdf = lessons.some(l => l.pdf_url);
        const hasVideo = lessons.some(l => l.video_url);
        if (!hasPdf && !hasVideo) {
          errors.push(`Module "${m.title}" : aucune lecon PDF ou video`);
        }
      }
    });
  }

  const isComplete = errors.length === 0;

  console.log('');
  console.log(`[${idx+1}] ${f.title}`);
  console.log(`     ID : ${f.id.substring(0, 8)}...`);
  console.log(`     is_published : ${f.is_published}`);
  console.log(`     Description  : ${(f.description || '').length} car.`);
  console.log(`     Prix         : ${f.price || 0} ${f.currency || 'USD'}`);
  console.log(`     Dates        : ${f.start_date || '?'} -> ${f.end_date || '?'}`);
  console.log(`     Duree        : ${f.total_hours || 0}h`);
  console.log(`     Formateur    : ${trainerName}`);
  console.log(`     Modules      : ${modules.length}`);

  if (isComplete) {
    console.log(`     STATUT       : COMPLET`);
    complete++;
  } else {
    console.log(`     STATUT       : INCOMPLET (${errors.length} erreur(s))`);
    errors.forEach(e => console.log(`       - ${e}`));
    incomplete++;
    toLock.push(f.id);
  }
});

console.log('');
console.log('========================================');
console.log(' RESUME');
console.log('========================================');
console.log(`  Formations completes   : ${complete}`);
console.log(`  Formations incompletes : ${incomplete}`);
console.log(`  A verrouiller          : ${toLock.length}`);
console.log('');

// Verrouiller les formations incompletes
if (toLock.length > 0) {
  console.log('========================================');
  console.log(' VERROUILLAGE');
  console.log('========================================');
  const update = db.prepare('UPDATE formations SET is_published = 0, updated_at = ? WHERE id = ?');
  const now = new Date().toISOString();
  toLock.forEach(id => {
    update.run(now, id);
    console.log(`  [LOCKED] ${id.substring(0, 8)}...`);
  });
  console.log('');
  console.log(`  ${toLock.length} formation(s) verrouillee(s)`);
}

db.close();