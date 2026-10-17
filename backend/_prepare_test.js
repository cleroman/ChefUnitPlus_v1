const Database = require('better-sqlite3');
const path = require('path');
try {
    const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));
    
    // S'assurer que Chef Test est en attente de validation (pour tester le parcours)
    const result = db.prepare(`
        UPDATE users 
        SET statut = 'pending_validation', is_active = 0 
        WHERE email = 'chef.test@chefunitplus.com'
    `).run();
    
    if (result.changes > 0) {
        console.log('  ✅ Utilisateur "Chef Test" réinitialisé (pending_validation)');
    } else {
        console.log('  ℹ️  Utilisateur "Chef Test" déjà en attente ou inexistant');
    }
    
    // Compter les preuves
    const count = db.prepare('SELECT COUNT(*) as c FROM proof_documents').get();
    console.log(`  📊 Preuves dans la base : ${count.c}`);
    
    db.close();
} catch (err) {
    console.error('  ❌ Erreur DB:', err.message);
}
