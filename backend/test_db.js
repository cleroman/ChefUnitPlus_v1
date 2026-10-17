const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));

const tables = ['users', 'enrollments', 'notifications', 'messages', 'formations'];
tables.forEach(t => {
  try {
    const r = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get();
    console.log('  ' + t + ' : ' + r.c + ' enregistrements');
  } catch (e) {
    console.log('  ' + t + ' : TABLE MANQUANTE');
  }
});

db.close();