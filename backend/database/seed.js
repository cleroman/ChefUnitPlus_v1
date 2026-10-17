// ChefUnitPlus - Donnees de demonstration
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../src/config/database');

async function seed() {
  console.log('Insertion des donnees de demonstration...');

  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@chefunitplus.com');
  if (existing) {
    console.log('Les donnees existent deja. Abandon.');
    return;
  }

  const adminHash = await bcrypt.hash('admin123', 10);
  db.prepare(
    'INSERT INTO users (id, full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(uuidv4(), 'Admin Principal', 'admin@chefunitplus.com', '243890000000', adminHash, 'admin');
  console.log('Admin cree : admin@chefunitplus.com / admin123');

  const dirHash = await bcrypt.hash('directeur123', 10);
  const dirId = uuidv4();
  db.prepare(
    'INSERT INTO users (id, full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(dirId, 'Directeur Test', 'directeur@chefunitplus.com', '243890000001', dirHash, 'directeur');
  console.log('Directeur cree : directeur@chefunitplus.com / directeur123');

  const formHash = await bcrypt.hash('formateur123', 10);
  db.prepare(
    'INSERT INTO users (id, full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(uuidv4(), 'Formateur Test', 'formateur@chefunitplus.com', '243890000002', formHash, 'formateur');
  console.log('Formateur cree : formateur@chefunitplus.com / formateur123');

  const learnerHash = await bcrypt.hash('apprenant123', 10);
  db.prepare(
    'INSERT INTO users (id, full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(uuidv4(), 'Apprenant Test', 'apprenant@chefunitplus.com', '243890000003', learnerHash, 'apprenant');
  console.log('Apprenant cree : apprenant@chefunitplus.com / apprenant123');

  db.prepare(
    'INSERT INTO formations (id, title, description, price, currency, director_id, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(uuidv4(), 'Leadership Fondamental', 'Les bases du leadership moderne.', 25.0, 'USD', dirId, 1);
  console.log('Formation de demo creee');

  console.log('');
  console.log('Donnees de demonstration inserees avec succes');
}

seed().catch(console.error);