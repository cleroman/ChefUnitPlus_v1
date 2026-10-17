// ChefUnitPlus - Migration payment_requests
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    enrollment_id TEXT,
    formation_id TEXT,
    payment_number_id TEXT NOT NULL,
    operator TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    reference_number TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    validated_at DATETIME,
    validated_by TEXT,
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (payment_number_id) REFERENCES payment_numbers(id)
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_payment_requests_user ON payment_requests(user_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status)`);

console.log('[OK] Table payment_requests creee');
db.close();