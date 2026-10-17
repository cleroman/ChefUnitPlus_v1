try {
  require('./src/routes/index.js');
  console.log('OK - Routes chargees');
} catch(e) {
  console.log('ERREUR: ' + e.message);
  console.log(e.stack);
}