// ChefUnitPlus - Migration : tables de suivi
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

// ============================================================
// 1. TABLE attendance (presence)
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    formation_id TEXT NOT NULL,
    module_id TEXT,
    session_date DATE NOT NULL,
    check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    check_out_time DATETIME,
    status TEXT DEFAULT 'present',
    qr_code TEXT,
    latitude REAL,
    longitude REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (formation_id) REFERENCES formations(id)
  )
`);
console.log('[OK] Table attendance creee');

// ============================================================
// 2. TABLE formation_materials (PDF/videos)
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS formation_materials (
    id TEXT PRIMARY KEY,
    formation_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    duration_minutes INTEGER,
    is_downloadable INTEGER DEFAULT 1,
    uploaded_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (formation_id) REFERENCES formations(id)
  )
`);
console.log('[OK] Table formation_materials creee');

// ============================================================
// 3. TABLE module_materials (modules par date)
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS module_materials (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    release_date DATE,
    is_downloadable INTEGER DEFAULT 1,
    uploaded_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id)
  )
`);
console.log('[OK] Table module_materials creee');

// ============================================================
// 4. TABLE questions (questions au formateur)
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    formation_id TEXT NOT NULL,
    module_id TEXT,
    trainer_id TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'normal',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (formation_id) REFERENCES formations(id)
  )
`);
console.log('[OK] Table questions creee');

// ============================================================
// 5. TABLE answers (reponses)
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_accepted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);
console.log('[OK] Table answers creee');

// ============================================================
// INDEX
// ============================================================
db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_formation ON attendance(formation_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_formation_materials_formation ON formation_materials(formation_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_module_materials_module ON module_materials(module_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_questions_user ON questions(user_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_questions_formation ON questions(formation_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id)`);
console.log('[OK] Index crees');

console.log('');
console.log('=== MIGRATION TERMINEE ===');
db.close();