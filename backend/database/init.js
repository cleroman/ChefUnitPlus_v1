// ChefUnitPlus - Initialisation de la base de donnees
const db = require('../src/config/database');

console.log('Initialisation de la base de donnees...');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'apprenant',
    avatar_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS formations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    cover_image TEXT,
    director_id TEXT REFERENCES users(id),
    is_published INTEGER DEFAULT 0,
    enrolled_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    formation_id TEXT REFERENCES formations(id) ON DELETE CASCADE,
    trainer_id TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    module_id TEXT REFERENCES modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'text',
    video_url TEXT,
    pdf_url TEXT,
    audio_url TEXT,
    duration INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    is_preview INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    learner_id TEXT REFERENCES users(id),
    formation_id TEXT REFERENCES formations(id),
    formation_title TEXT,
    status TEXT DEFAULT 'pendingPayment',
    amount_paid REAL DEFAULT 0,
    payment_ref TEXT,
    director_comment TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    validated_at DATETIME
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    enrollment_id TEXT REFERENCES enrollments(id),
    order_number TEXT UNIQUE,
    transaction_id TEXT,
    amount REAL,
    currency TEXT DEFAULT 'USD',
    status TEXT,
    provider TEXT DEFAULT 'flexpaie',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    formation_id TEXT REFERENCES formations(id),
    certificate_number TEXT UNIQUE,
    pdf_url TEXT,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
  )
`);

console.log('Base de donnees initialisee avec succes');
console.log('Tables : users, formations, modules, lessons, enrollments, payments, certificates');