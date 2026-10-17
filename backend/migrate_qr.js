const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));

// Table qr_codes
db.exec(`
  CREATE TABLE IF NOT EXISTS qr_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    formation_id TEXT NOT NULL,
    payment_request_id TEXT,
    code TEXT UNIQUE NOT NULL,
    qr_data TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active INTEGER DEFAULT 1,
    scanned_count INTEGER DEFAULT 0,
    last_scanned_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (formation_id) REFERENCES formations(id)
  )
`);
console.log('[OK] Table qr_codes');

// Index
db.exec(`CREATE INDEX IF NOT EXISTS idx_qr_user ON qr_codes(user_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_qr_formation ON qr_codes(formation_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_qr_code ON qr_codes(code)`);
console.log('[OK] Index');

// Table scan_logs
db.exec(`
  CREATE TABLE IF NOT EXISTS qr_scan_logs (
    id TEXT PRIMARY KEY,
    qr_code_id TEXT NOT NULL,
    scanned_by TEXT,
    scan_type TEXT DEFAULT 'check-in',
    latitude REAL,
    longitude REAL,
    is_valid INTEGER DEFAULT 1,
    error_message TEXT,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id)
  )
`);
console.log('[OK] Table qr_scan_logs');

db.close();