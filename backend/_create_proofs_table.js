const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
    const db = new Database(dbPath);
    
    console.log('📁 Base de données :', dbPath);
    console.log('');
    
    // Vérifier si la table existe déjà
    const existingTables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='proof_documents'
    `).all();
    
    if (existingTables.length > 0) {
        console.log('ℹ️  La table proof_documents existe déjà !');
    } else {
        console.log('🔨 Création de la table proof_documents...');
        
        db.exec(`
            CREATE TABLE IF NOT EXISTS proof_documents (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT,
                file_name TEXT,
                file_path TEXT,
                file_type TEXT,
                file_size INTEGER,
                uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
                validated_by_admin INTEGER DEFAULT 0,
                validated_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_proof_documents_user_id 
            ON proof_documents(user_id);
        `);
        
        console.log('✅ Table proof_documents créée avec succès !');
    }
    
    // Afficher la structure
    console.log('');
    console.log('📊 Structure de la table :');
    const columns = db.prepare('PRAGMA table_info(proof_documents)').all();
    columns.forEach(col => {
        console.log(`   • ${col.name} (${col.type})`);
    });
    
    // Compter les preuves
    const count = db.prepare('SELECT COUNT(*) as c FROM proof_documents').get();
    console.log('');
    console.log(`📈 Nombre de preuves dans la base : ${count.c}`);
    
    // Liste des utilisateurs
    const users = db.prepare(`
        SELECT id, full_name, email, fonction
        FROM users
        LIMIT 5
    `).all();
    
    console.log('');
    console.log('👥 Quelques utilisateurs :');
    users.forEach(u => {
        console.log(`   • ${u.full_name} (${u.fonction || 'RAS'})`);
    });
    
    db.close();
    console.log('');
    console.log('✅ TERMINÉ');
    
} catch (err) {
    console.error('❌ Erreur :', err.message);
}
