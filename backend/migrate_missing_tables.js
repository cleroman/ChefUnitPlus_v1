const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

// ============================================================
// 1. TABLE attendance
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
    latitude REAL,
    longitude REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[OK] attendance');

// ============================================================
// 2. TABLE formation_materials
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[OK] formation_materials');

// ============================================================
// 3. TABLE module_materials
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[OK] module_materials');

// ============================================================
// 4. TABLE questions
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[OK] questions');

// ============================================================
// 5. TABLE answers
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_accepted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[OK] answers');

// ============================================================
// 6. TABLE payment_methods (optionnel)
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    operator TEXT,
    phone_number TEXT,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[OK] payment_methods');

// ============================================================
// 7. TABLE notifications (optionnel)
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[OK] notifications');

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
db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
console.log('[OK] Index');

// ============================================================
// VERIFICATION
// ============================================================
console.log('');
console.log('=== TOUTES LES TABLES ===');
const tables = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();
tables.forEach(t => console.log(`  ${t.name}`));

db.close();