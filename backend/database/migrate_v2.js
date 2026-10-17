// =============================================================
// ChefUnitPlus - Migration v2 : Ajout des tables Scout
// Executer : node database/migrate_v2.js
// =============================================================

const db = require('../src/config/database');

console.log('Migration v2 : ajout des tables scout...');

// 1. Table scout_groups
db.exec(`
  CREATE TABLE IF NOT EXISTS scout_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT,
    district TEXT,
    description TEXT,
    director_id TEXT REFERENCES users(id),
    members_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_by TEXT REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('  OK : scout_groups');

// 2. Table user_details
db.exec(`
  CREATE TABLE IF NOT EXISTS user_details (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'RDC',
    birth_date DATE,
    education_level TEXT,
    education_field TEXT,
    education_institution TEXT,
    scout_formation TEXT,
    scout_role TEXT,
    group_id TEXT REFERENCES scout_groups(id),
    profile_photo_url TEXT,
    bio TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('  OK : user_details');

// 3. Table complaints
db.exec(`
  CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'autre',
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'normal',
    admin_response TEXT,
    responded_by TEXT REFERENCES users(id),
    responded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('  OK : complaints');

// 4. Table password_requests
db.exec(`
  CREATE TABLE IF NOT EXISTS password_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    reason TEXT,
    status TEXT DEFAULT 'pending',
    new_password_hash TEXT,
    processed_by TEXT REFERENCES users(id),
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('  OK : password_requests');

// 5. Ajouter la colonne director_pedagogique dans users si absente
try {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasGroupId = columns.some(c => c.name === 'group_id');

  if (!hasGroupId) {
    db.exec('ALTER TABLE users ADD COLUMN group_id TEXT REFERENCES scout_groups(id)');
    console.log('  OK : colonne group_id ajoutee a users');
  } else {
    console.log('  colonne group_id deja presente');
  }
} catch (e) {
  console.log('  Info : ' + e.message);
}

console.log('');
console.log('Migration v2 terminee avec succes !');
console.log('Tables ajoutees : scout_groups, user_details, complaints, password_requests');