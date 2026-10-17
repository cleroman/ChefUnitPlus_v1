require('dotenv').config();
const db = require('./src/config/database');
(async () => {
  try {
    const r = await db.query('SELECT NOW() as now');
    console.log('TEST_OK', r[0].now);
    process.exit(0);
  } catch (e) {
    console.log('TEST_ERROR', e.message);
    process.exit(1);
  }
})();