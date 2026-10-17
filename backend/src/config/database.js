// =============================================================
// ChefUnitPlus - Configuration Database
// SUPPORT SQLITE + POSTGRESQL
// Selection automatique via DB_TYPE (env) ou DATABASE_URL
// =============================================================

const path = require('path');
const fs = require('fs');

// Determiner le type de DB
const dbType = (process.env.DB_TYPE || '').toLowerCase();
const hasDatabaseUrl = !!process.env.DATABASE_URL;

// PostgreSQL UNIQUEMENT si DB_TYPE=postgres OU DATABASE_URL present
const usePostgres = dbType === 'postgres'
    || dbType === 'postgresql'
    || (hasDatabaseUrl && dbType !== 'sqlite');

console.log(`[database] Type detecte : ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);

let db;

if (usePostgres) {
    // ==================== POSTGRESQL ====================
    const { Pool } = require('pg');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    pool.query('SELECT NOW()')
        .then(() => console.log('[database] PostgreSQL connecte'))
        .catch(err => {
            console.error('[database] Erreur PostgreSQL :', err.message);
            process.exit(1);
        });

    function toPgSql(sql) {
        let i = 0;
        return sql.replace(/\?/g, () => `$${++i}`);
    }

    db = {
        prepare: (sql) => ({
            get: (...params) => {
                const pgSql = toPgSql(sql);
                return pool.query(pgSql, params)
                    .then(r => r.rows[0] || null)
                    .catch(err => {
                        console.error('[db.get] SQL:', pgSql);
                        console.error('[db.get] Error:', err.message);
                        throw err;
                    });
            },
            all: (...params) => {
                const pgSql = toPgSql(sql);
                return pool.query(pgSql, params)
                    .then(r => r.rows || [])
                    .catch(err => {
                        console.error('[db.all] SQL:', pgSql);
                        console.error('[db.all] Error:', err.message);
                        throw err;
                    });
            },
            run: (...params) => {
                const pgSql = toPgSql(sql);
                return pool.query(pgSql, params)
                    .then(r => ({
                        changes: r.rowCount,
                        rows: r.rows,
                    }))
                    .catch(err => {
                        console.error('[db.run] SQL:', pgSql);
                        console.error('[db.run] Error:', err.message);
                        throw err;
                    });
            },
        }),
        query: (sql, params = []) => {
            const pgSql = toPgSql(sql);
            return pool.query(pgSql, params).then(r => r.rows || []);
        },
        queryOne: (sql, params = []) => {
            const pgSql = toPgSql(sql);
            return pool.query(pgSql, params).then(r => r.rows[0] || null);
        },
        execute: (sql, params = []) => {
            const pgSql = toPgSql(sql);
            return pool.query(pgSql, params).then(r => ({
                changes: r.rowCount,
                rows: r.rows,
            }));
        },
        close: () => pool.end(),
        pool,
    };

} else {
    // ==================== SQLITE ====================
    const Database = require('better-sqlite3');

    const dbPath = process.env.DB_PATH
        ? path.resolve(process.env.DB_PATH)
        : path.join(__dirname, '..', '..', 'database', 'chefunitplus.db');

    console.log(`[database] Fichier SQLite : ${dbPath}`);

    if (!fs.existsSync(dbPath)) {
        console.error(`[database] Fichier introuvable : ${dbPath}`);
        process.exit(1);
    }

    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    console.log('[database] SQLite connecte');

    db = {
        prepare: (sql) => ({
            get: async (...params) => {
                try {
                    return sqlite.prepare(sql).get(...params) || null;
                } catch (err) {
                    console.error('[db.get] SQL:', sql);
                    console.error('[db.get] Error:', err.message);
                    throw err;
                }
            },
            all: async (...params) => {
                try {
                    return sqlite.prepare(sql).all(...params) || [];
                } catch (err) {
                    console.error('[db.all] SQL:', sql);
                    console.error('[db.all] Error:', err.message);
                    throw err;
                }
            },
            run: async (...params) => {
                try {
                    const result = sqlite.prepare(sql).run(...params);
                    return {
                        changes: result.changes,
                        lastInsertRowid: result.lastInsertRowid,
                        rows: [],
                    };
                } catch (err) {
                    console.error('[db.run] SQL:', sql);
                    console.error('[db.run] Error:', err.message);
                    throw err;
                }
            },
        }),
        query: async (sql, params = []) => {
            try {
                return sqlite.prepare(sql).all(...params) || [];
            } catch (err) {
                console.error('[db.query] SQL:', sql);
                console.error('[db.query] Error:', err.message);
                throw err;
            }
        },
        queryOne: async (sql, params = []) => {
            try {
                return sqlite.prepare(sql).get(...params) || null;
            } catch (err) {
                console.error('[db.queryOne] SQL:', sql);
                console.error('[db.queryOne] Error:', err.message);
                throw err;
            }
        },
        execute: async (sql, params = []) => {
            try {
                const result = sqlite.prepare(sql).run(...params);
                return {
                    changes: result.changes,
                    lastInsertRowid: result.lastInsertRowid,
                };
            } catch (err) {
                console.error('[db.execute] SQL:', sql);
                console.error('[db.execute] Error:', err.message);
                throw err;
            }
        },
        close: () => sqlite.close(),
        sqlite,
    };
}

module.exports = db;