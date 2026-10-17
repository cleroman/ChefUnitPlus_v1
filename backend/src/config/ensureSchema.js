// =============================================================
// ChefUnitPlus - Auto-creation des tables au demarrage
// IDEMPOTENT et COMPATIBLE SQLite + PostgreSQL
// =============================================================

const db = require('./database');

// =============================================================
// HELPER : executer une requete DDL selon le type de DB
// =============================================================
async function execDDL(sql) {
  // Detecter si c'est du SQLite ou PostgreSQL
  const isSqlite = !!db.sqlite;

  try {
    if (isSqlite) {
      // SQLite : utiliser exec() qui accepte tout
      db.sqlite.exec(sql);
    } else {
      // PostgreSQL : utiliser query()
      await db.query(sql);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// =============================================================
// HELPER : verifier si une colonne existe
// =============================================================
async function columnExists(table, column) {
  const isSqlite = !!db.sqlite;

  try {
    if (isSqlite) {
      // SQLite : PRAGMA table_info
      const cols = db.sqlite.prepare(`PRAGMA table_info(${table})`).all();
      return cols.some(c => c.name === column);
    } else {
      // PostgreSQL : information_schema
      const result = await db.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = $1 AND column_name = $2`,
        [table, column]
      );
      return result && result.length > 0;
    }
  } catch (e) {
    return false;
  }
}

// =============================================================
// TABLES
// =============================================================
const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    confirmation_email TEXT,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'apprenant',
    avatar_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS formations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    cover_image TEXT,
    director_id TEXT REFERENCES users(id),
    is_published INTEGER DEFAULT 0,
    enrolled_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    formation_id TEXT REFERENCES formations(id) ON DELETE CASCADE,
    trainer_id TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS lessons (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    learner_id TEXT REFERENCES users(id),
    formation_id TEXT REFERENCES formations(id),
    formation_title TEXT,
    status TEXT DEFAULT 'pendingPayment',
    amount_paid REAL DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    payment_ref TEXT,
    director_comment TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    validated_at TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    enrollment_id TEXT REFERENCES enrollments(id),
    order_number TEXT UNIQUE,
    transaction_id TEXT,
    amount REAL,
    currency TEXT DEFAULT 'USD',
    status TEXT,
    provider TEXT DEFAULT 'flexpaie',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    formation_id TEXT REFERENCES formations(id),
    certificate_number TEXT UNIQUE,
    pdf_url TEXT,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    type TEXT,
    title TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT REFERENCES users(id),
    receiver_id TEXT REFERENCES users(id),
    subject TEXT,
    content TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    author_id TEXT,
    category TEXT DEFAULT 'actualite',
    is_published INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    author_id TEXT,
    duration INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
];

async function ensureSchema() {
  console.log('[ensureSchema] Verification des tables...');

  // --- Migration : confirmation_email ---
  const hasConfEmail = await columnExists('users', 'confirmation_email');
  if (!hasConfEmail) {
    const r = await execDDL('ALTER TABLE users ADD COLUMN confirmation_email TEXT');
    if (r.ok) {
      console.log('[ensureSchema] [OK] Colonne confirmation_email ajoutee');
    } else {
      console.log('[ensureSchema] [i] confirmation_email : ' + r.error);
    }
  }

  // --- Migrations users ---
  const hasCurrentFormation = await columnExists('users', 'current_formation_id');
  if (!hasCurrentFormation) {
    await execDDL('ALTER TABLE users ADD COLUMN current_formation_id TEXT');
  }

  const hasFormationStarted = await columnExists('users', 'formation_started_at');
  if (!hasFormationStarted) {
    await execDDL('ALTER TABLE users ADD COLUMN formation_started_at TIMESTAMP');
  }

  // --- Migrations enrollments ---
  const hasIsActive = await columnExists('enrollments', 'is_active');
  if (!hasIsActive) {
    await execDDL('ALTER TABLE enrollments ADD COLUMN is_active BOOLEAN DEFAULT 1');
  }

  const hasCompletedAt = await columnExists('enrollments', 'completed_at');
  if (!hasCompletedAt) {
    await execDDL('ALTER TABLE enrollments ADD COLUMN completed_at TIMESTAMP');
  }

  console.log('[ensureSchema] [OK] Migrations terminees');

  // --- Creation des tables ---
  let created = 0;
  let failed = 0;

  for (const sql of TABLES) {
    const r = await execDDL(sql);
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
    if (r.ok) {
      created++;
    } else {
      failed++;
      console.error(`  [XX] ${tableName} : ${r.error}`);
    }
  }

  console.log(`[ensureSchema] ${created}/${TABLES.length} tables verifiees (${failed} echecs)`);
  return created;
}

module.exports = { ensureSchema };
