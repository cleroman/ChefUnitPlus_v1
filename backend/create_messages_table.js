const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath);

// Verifier si la table existe
const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'").get();

if (!tableExists) {
  console.log('Creation de la table messages...');
  db.prepare(`
    CREATE TABLE messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      subject TEXT,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `).run();

  db.prepare("CREATE INDEX idx_messages_receiver ON messages(receiver_id)").run();
  db.prepare("CREATE INDEX idx_messages_sender ON messages(sender_id)").run();
  db.prepare("CREATE INDEX idx_messages_created ON messages(created_at)").run();

  console.log('Table messages creee avec succes');
} else {
  console.log('Table messages existe deja');
}

db.close();