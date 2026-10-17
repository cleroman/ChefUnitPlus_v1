const Database = require('better-sqlite3');
const path = require('path');
try {
    const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));
    
    // Réinitialiser Chef Test pour tester le parcours complet
    db.prepare(`
        UPDATE users 
        SET statut = 'proofs_pending', 
            is_active = 1, 
            registration_code = '123456',
            code_is_used = 0,
            code_attempts = 0
        WHERE email = 'chef.test@chefunitplus.com'
    `).run();
    
    console.log('  ✅ Chef Test configuré :');
    console.log('     📧 chef.test@chefunitplus.com');
    console.log('     🔑 Chef123!');
    console.log('     📌 Statut : proofs_pending');
    console.log('     🎫 Code : 123456');
    console.log('     📄 Fonction : Chef (≠ RAS)');
    
    db.close();
} catch (err) {
    console.error('  ❌', err.message);
}
