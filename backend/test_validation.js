try {
  const ctrl = require('./src/controllers/formationValidation.controller.js');
  console.log('OK - Controller charge');
  console.log('   canPublish:', typeof ctrl.canPublish);
  console.log('   publish:', typeof ctrl.publish);
  console.log('   unpublish:', typeof ctrl.unpublish);
} catch(e) {
  console.log('ERREUR:', e.message);
}