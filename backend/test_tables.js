const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('TABLES=' + tables.length);
tables.forEach(t => console.log('TABLE=' + t.name));
db.close();