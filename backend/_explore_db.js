const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chefunitplus.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n' + '='.repeat(78));
console.log('  EXPLORATION BASE DE DONNEES');
console.log('  ' + dbPath);
console.log('='.repeat(78));

// =====================================================================
//  1. LISTE DES TABLES
// =====================================================================
const tables = db.prepare(`
  SELECT name, type FROM sqlite_master
  WHERE type IN ('table', 'view')
    AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

console.log('\n' + '='.repeat(78));
console.log('  1. LISTE DES TABLES (' + tables.length + ')');
console.log('='.repeat(78));

tables.forEach((t, i) => {
  console.log(`  ${String(i + 1).padStart(3)}. [${t.type.toUpperCase()}] ${t.name}`);
});

// =====================================================================
//  2. POUR CHAQUE TABLE : SCHEMA + COUNT + CONTENU
// =====================================================================
console.log('\n' + '='.repeat(78));
console.log('  2. DETAIL DE CHAQUE TABLE');
console.log('='.repeat(78));

const results = {};

tables.forEach(t => {
  const tableName = t.name;

  console.log('\n' + '-'.repeat(78));
  console.log(`  TABLE : ${tableName}`);
  console.log('-'.repeat(78));

  // Count
  let count = 0;
  try {
    const r = db.prepare(`SELECT COUNT(*) as c FROM "${tableName}"`).get();
    count = r.c;
  } catch (e) {
    console.log(`  [!] Erreur count: ${e.message}`);
  }
  console.log(`  Lignes : ${count}`);

  // Schema
  let columns = [];
  try {
    columns = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    console.log(`  Colonnes (${columns.length}) :`);
    columns.forEach(c => {
      const pk = c.pk ? ' [PK]' : '';
      const notnull = c.notnull ? ' NOT NULL' : '';
      const dflt = c.dflt_value !== null ? ` DEFAULT ${c.dflt_value}` : '';
      console.log(`    - ${c.name} (${c.type})${pk}${notnull}${dflt}`);
    });
  } catch (e) {
    console.log(`  [!] Erreur schema: ${e.message}`);
  }

  // Contenu (limite a 20 lignes)
  if (count > 0) {
    try {
      const limit = Math.min(count, 20);
      const rows = db.prepare(`SELECT * FROM "${tableName}" LIMIT ${limit}`).all();

      console.log(`  Contenu (${limit} ligne${limit > 1 ? 's' : ''} affichee${limit > 1 ? 's' : ''} sur ${count}) :`);

      // Determiner les colonnes a afficher (max 8 pour lisibilite)
      const cols = columns.slice(0, 8).map(c => c.name);
      const hidden = columns.length - cols.length;

      // En-tete
      const header = cols.map(c => c.substring(0, 20).padEnd(20)).join(' | ');
      console.log('    ' + header);
      console.log('    ' + '-'.repeat(header.length));

      rows.forEach(row => {
        const line = cols.map(c => {
          let val = row[c];
          if (val === null || val === undefined) val = 'NULL';
          if (typeof val === 'string' && val.length > 20) val = val.substring(0, 17) + '...';
          return String(val).padEnd(20);
        }).join(' | ');
        console.log('    ' + line);
      });

      if (hidden > 0) {
        console.log(`    ... (+${hidden} colonnes masquees)`);
      }
      if (count > limit) {
        console.log(`    ... (+${count - limit} lignes masquees)`);
      }

      results[tableName] = { count, columns: columns.length, rows: rows.length };
    } catch (e) {
      console.log(`  [!] Erreur lecture: ${e.message}`);
    }
  } else {
    console.log('  (table vide)');
    results[tableName] = { count: 0, columns: columns.length, rows: 0 };
  }
});

// =====================================================================
//  3. RESUME GLOBAL
// =====================================================================
console.log('\n' + '='.repeat(78));
console.log('  3. RESUME GLOBAL');
console.log('='.repeat(78));

console.log('\n  Table'.padEnd(35) + 'Lignes'.padStart(10) + 'Colonnes'.padStart(12));
console.log('  ' + '-'.repeat(55));

let totalRows = 0;
Object.keys(results).sort().forEach(name => {
  const r = results[name];
  totalRows += r.count;
  console.log(`  ${name.padEnd(33)} ${String(r.count).padStart(10)} ${String(r.columns).padStart(12)}`);
});

console.log('  ' + '-'.repeat(55));
console.log(`  TOTAL : ${Object.keys(results).length} tables, ${totalRows} lignes au total`);

// =====================================================================
//  4. FOCUS SUR LA TABLE users
// =====================================================================
console.log('\n' + '='.repeat(78));
console.log('  4. FOCUS : TABLE users (detail complet)');
console.log('='.repeat(78));

try {
  const users = db.prepare('SELECT * FROM users LIMIT 5').all();
  console.log(`\n  ${users.length} utilisateur(s) affiche(s) (max 5)`);
  users.forEach((u, i) => {
    console.log(`\n  --- Utilisateur ${i + 1} ---`);
    Object.keys(u).forEach(k => {
      let val = u[k];
      if (val === null || val === undefined) val = 'NULL';
      if (typeof val === 'string' && val.length > 60) val = val.substring(0, 57) + '...';
      console.log(`    ${k.padEnd(25)} : ${val}`);
    });
  });

  // Repartition par statut
  console.log('\n  --- Repartition par statut ---');
  const statuts = db.prepare(`
    SELECT statut, COUNT(*) as c FROM users GROUP BY statut ORDER BY c DESC
  `).all();
  statuts.forEach(s => {
    console.log(`    ${(s.statut || 'NULL').padEnd(30)} : ${s.c}`);
  });

  // Repartition par fonction
  console.log('\n  --- Repartition par fonction ---');
  const fonctions = db.prepare(`
    SELECT fonction, COUNT(*) as c FROM users GROUP BY fonction ORDER BY c DESC
  `).all();
  fonctions.forEach(f => {
    console.log(`    ${(f.fonction || 'NULL').padEnd(30)} : ${f.c}`);
  });

  // Repartition par role
  console.log('\n  --- Repartition par role ---');
  const roles = db.prepare(`
    SELECT role, COUNT(*) as c FROM users GROUP BY role ORDER BY c DESC
  `).all();
  roles.forEach(r => {
    console.log(`    ${(r.role || 'NULL').padEnd(30)} : ${r.c}`);
  });
} catch (e) {
  console.log(`  [!] Erreur : ${e.message}`);
}

// =====================================================================
//  5. INTEGRITE - FOREIGN KEYS
// =====================================================================
console.log('\n' + '='.repeat(78));
console.log('  5. INTEGRITE REFERENTIELLE');
console.log('='.repeat(78));

tables.forEach(t => {
  try {
    const fks = db.prepare(`PRAGMA foreign_key_list("${t.name}")`).all();
    if (fks.length > 0) {
      console.log(`\n  ${t.name} :`);
      fks.forEach(fk => {
        console.log(`    - ${fk.from} -> ${fk.table}.${fk.to}`);
      });
    }
  } catch (e) {}
});

// =====================================================================
//  6. INDEX
// =====================================================================
console.log('\n' + '='.repeat(78));
console.log('  6. INDEX');
console.log('='.repeat(78));

tables.forEach(t => {
  try {
    const idx = db.prepare(`PRAGMA index_list("${t.name}")`).all();
    if (idx.length > 0) {
      console.log(`\n  ${t.name} (${idx.length} index) :`);
      idx.forEach(i => {
        const uniq = i.unique ? ' [UNIQUE]' : '';
        console.log(`    - ${i.name}${uniq}`);
      });
    }
  } catch (e) {}
});

console.log('\n' + '='.repeat(78));
console.log('  FIN DE L\'EXPLORATION');
console.log('='.repeat(78) + '\n');

db.close();
