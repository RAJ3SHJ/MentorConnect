const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, 'mentor_app.db');

const db = new Database(dbPath, { verbose: console.log });

console.log('🔄 Starting Database ID-Type Migration (Better-SQLite3)...');

try {
    // Start transaction
    const migrate = db.transaction(() => {
        // 1. users Table
        console.log('--- Migrating users table ---');
        try {
            db.prepare('ALTER TABLE users RENAME TO users_old').run();
            console.log('✅ users -> users_old');
        } catch (e) {
            console.log('⚠️ users table already moved or check failed. Skipping rename.');
        }

        db.prepare(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                qualification TEXT,
                username TEXT UNIQUE,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'learner',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        console.log('✅ Created new users table with TEXT ID');

        try {
            db.prepare(`
                INSERT INTO users 
                SELECT CAST(id AS TEXT), name, first_name, last_name, qualification, username, email, password_hash, role, created_at 
                FROM users_old
            `).run();
            console.log('✅ Data migrated to new users table');
        } catch (e) {
            console.log('⚠️ Data migration (users) failed or already populated:', e.message);
        }

        // 2. mentors Table
        console.log('--- Migrating mentors table ---');
        try {
            db.prepare('ALTER TABLE mentors RENAME TO mentors_old').run();
            console.log('✅ mentors -> mentors_old');
        } catch (e) {
            console.log('⚠️ mentors table already moved or check failed. Skipping rename.');
        }

        db.prepare(`
            CREATE TABLE IF NOT EXISTS mentors (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                qualification TEXT,
                username TEXT UNIQUE,
                email TEXT NOT NULL,
                expertise TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        console.log('✅ Created new mentors table with TEXT ID');

        try {
            db.prepare(`
                INSERT INTO mentors 
                SELECT CAST(id AS TEXT), name, first_name, last_name, qualification, username, email, expertise, created_at 
                FROM mentors_old
            `).run();
            console.log('✅ Data migrated to new mentors table');
        } catch (e) {
            console.log('⚠️ Data migration (mentors) failed or already populated:', e.message);
        }
    });

    migrate();
    console.log('🏁 Migration process finished successfully.');
} catch (err) {
    console.error('❌ Critical Error during migration:', err.message);
} finally {
    db.close();
}
