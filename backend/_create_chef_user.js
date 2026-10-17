const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

try {
    const db = new Database(path.join(__dirname, 'database', 'chefunitplus.db'));
    
    // 1. Afficher la structure de la table users
    console.log('📊 Structure de la table users :');
    console.log('');
    const columns = db.prepare('PRAGMA table_info(users)').all();
    columns.forEach(col => {
        const required = col.notnull ? ' (NOT NULL)' : '';
        const pk = col.pk ? ' (PK)' : '';
        console.log(`   • ${col.name} : ${col.type}${required}${pk}`);
    });
    console.log('');
    
    // 2. Chercher la colonne password
    const passwordCol = columns.find(c => 
        c.name.toLowerCase().includes('password') || 
        c.name.toLowerCase().includes('pwd')
    );
    
    if (!passwordCol) {
        console.log('❌ Aucune colonne password trouvée !');
        db.close();
        process.exit(1);
    }
    
    console.log(`✅ Colonne password : "${passwordCol.name}"`);
    console.log('');
    
    // 3. Vérifier si le user existe déjà
    const existing = db.prepare("SELECT id FROM users WHERE email = ?")
        .get('chef.test@chefunitplus.com');
    
    if (existing) {
        console.log('ℹ️  Utilisateur "Chef Test" existe déjà.');
        console.log(`   ID : ${existing.id}`);
    } else {
        console.log('🔨 Création de l\'utilisateur "Chef Test"...');
        
        const id = uuidv4();
        const hashedPassword = bcrypt.hashSync('Chef123!', 10);
        const now = new Date().toISOString();
        
        // Construire la requête dynamiquement selon les colonnes disponibles
        const availableCols = columns.map(c => c.name);
        
        const data = {
            id: id,
            full_name: 'Chef Test',
            email: 'chef.test@chefunitplus.com',
            [passwordCol.name]: hashedPassword,  // ← Utilise le bon nom
            role: 'utilisateur',
            fonction: 'Chef',
            statut: 'pending_validation',
            is_active: 0,
            created_at: now,
            updated_at: now
        };
        
        // Filtrer uniquement les colonnes qui existent
        const finalData = {};
        Object.keys(data).forEach(key => {
            if (availableCols.includes(key)) {
                finalData[key] = data[key];
            }
        });
        
        const cols = Object.keys(finalData);
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map(k => finalData[k]);
        
        const sql = `INSERT INTO users (${cols.join(', ')}) VALUES (${placeholders})`;
        
        try {
            db.prepare(sql).run(...values);
            console.log('');
            console.log('✅ Utilisateur "Chef Test" créé !');
            console.log('');
            console.log('   📧 Email    : chef.test@chefunitplus.com');
            console.log('   🔑 Password : Chef123!');
            console.log('   📌 Fonction : Chef (≠ RAS → preuves requises)');
            console.log('   📊 Statut   : pending_validation');
            console.log('   🚫 Actif    : Non (à valider)');
        } catch (insertErr) {
            console.log('');
            console.log('❌ Erreur INSERT :', insertErr.message);
            console.log('');
            console.log('🔍 Données tentées :');
            console.log(JSON.stringify(finalData, null, 2));
        }
    }
    
    // 4. Compter les users avec fonction != RAS
    console.log('');
    const chefCount = db.prepare(`
        SELECT COUNT(*) as c FROM users 
        WHERE UPPER(fonction) != 'RAS' 
        AND fonction IS NOT NULL 
        AND fonction != ''
    `).get();
    console.log(`📊 Utilisateurs avec fonction ≠ RAS : ${chefCount.c}`);
    
    // 5. Lister tous les users
    console.log('');
    console.log('👥 Tous les utilisateurs :');
    const users = db.prepare(`
        SELECT id, full_name, email, fonction, statut, is_active
        FROM users LIMIT 10
    `).all();
    users.forEach(u => {
        const fonc = u.fonction || '(vide)';
        const marker = fonc.toUpperCase() === 'RAS' ? '⚪' : '🔴';
        console.log(`   ${marker} ${u.full_name} | ${u.email} | fonction="${fonc}" | statut=${u.statut} | actif=${u.is_active}`);
    });
    
    db.close();
} catch (err) {
    console.error('❌ Erreur :', err.message);
}
