const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

try {
    const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));
    
    const existing = db.prepare("SELECT id FROM users WHERE email = 'chef.test@chefunitplus.com'").get();
    
    if (existing) {
        console.log('  ℹ️  Utilisateur test existe déjà.');
    } else {
        const id = uuidv4();
        const hashedPassword = bcrypt.hashSync('Chef123!', 10);
        
        db.prepare(`
            INSERT INTO users (
                id, full_name, email, password, role, fonction, 
                statut, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            'Chef Test',
            'chef.test@chefunitplus.com',
            hashedPassword,
            'utilisateur',
            'Chef',
            'pending_validation',
            0,
            new Date().toISOString(),
            new Date().toISOString()
        );
        
        console.log('  ✅ Utilisateur "Chef Test" créé !');
        console.log('     📧 Email    : chef.test@chefunitplus.com');
        console.log('     🔑 Password : Chef123!');
        console.log('     📌 Fonction : Chef (≠ RAS → preuves requises)');
    }
    
    // Compter les users avec fonction != RAS
    const chefCount = db.prepare(`
        SELECT COUNT(*) as c FROM users 
        WHERE UPPER(fonction) != 'RAS' AND fonction IS NOT NULL AND fonction != ''
    `).get();
    
    console.log('');
    console.log(`  📊 Utilisateurs avec fonction ≠ RAS : ${chefCount.c}`);
    
    db.close();
} catch (err) {
    console.error('  ❌', err.message);
}
