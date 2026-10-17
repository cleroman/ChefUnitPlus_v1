try {
  const ctrl = require('./src/controllers/formation.controller.js');
  console.log('OK - Controller charge');
  console.log('   list:', typeof ctrl.list);
} catch(e) {
  console.log('ERREUR:', e.message);
}