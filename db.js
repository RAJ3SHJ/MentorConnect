require('dotenv').config();
const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

const DB_URL = process.env.DATABASE_URL;
const isPG = !!DB_URL;

let pool = null;
let sqlite = null;

if (isPG) {
  pool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false } // Required for Render/Supabase
  });
  console.log('🔗 PostgreSQL Pool initialized');
} else {
  const DB_PATH = path.join(__dirname, 'mentor_app.db');
  sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  console.log('📁 SQLite initialized at', DB_PATH);
}

// Convert '?' placeholders to '$1, $2...' for Postgres
function fixSql(sql) {
  if (!isPG) return sql;
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}

async function initDb() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id ${isPG ? 'VARCHAR(255)' : 'TEXT'} PRIMARY KEY,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      qualification TEXT,
      username TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'learner',
      mentor_id ${isPG ? 'VARCHAR(255)' : 'TEXT'} REFERENCES users(id),
      is_active ${isPG ? 'BOOLEAN DEFAULT TRUE' : 'INTEGER DEFAULT 1'},
      status TEXT DEFAULT 'awaiting_review',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentors (
      id ${isPG ? 'VARCHAR(255)' : 'TEXT'} PRIMARY KEY,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      qualification TEXT,
      username TEXT UNIQUE,
      email TEXT NOT NULL,
      expertise TEXT,
      is_active ${isPG ? 'BOOLEAN DEFAULT TRUE' : 'INTEGER DEFAULT 1'},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentor_assignments (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      mentor_id ${isPG ? 'VARCHAR(255)' : 'TEXT'} REFERENCES users(id) ON DELETE CASCADE,
      student_id ${isPG ? 'VARCHAR(255)' : 'TEXT'} REFERENCES users(id) ON DELETE CASCADE,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      mentor_user_id ${isPG ? 'VARCHAR(255)' : 'TEXT'} REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(student_id)
    );

    CREATE TABLE IF NOT EXISTS courses (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      title TEXT NOT NULL,
      description TEXT,
      link TEXT,
      category TEXT,
      created_by_role TEXT,
      created_by_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS roadmap (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      student_id ${isPG ? 'VARCHAR(255)' : 'TEXT'} REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'Yet to Start',
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS student_skills (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      student_id ${isPG ? 'VARCHAR(255)' : 'TEXT'} REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      goal TEXT,
      skills TEXT,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exams (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      title TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS questions (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      exam_id INTEGER REFERENCES exams(id),
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exam_submissions (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      student_id ${isPG ? 'VARCHAR(255)' : 'TEXT'} REFERENCES users(id) ON DELETE CASCADE,
      exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
      answers TEXT,
      status TEXT DEFAULT 'Pending Review',
      mentor_remarks TEXT,
      rating INTEGER,
      verdict TEXT,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      type TEXT NOT NULL,
      student_id ${isPG ? 'VARCHAR(255)' : 'TEXT'} REFERENCES users(id) ON DELETE CASCADE,
      mentor_id ${isPG ? 'VARCHAR(255)' : 'TEXT'},
      reference_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentor_notifications (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      student_id ${isPG ? 'VARCHAR(255)' : 'TEXT'} REFERENCES users(id) ON DELETE CASCADE,
      trigger_type TEXT NOT NULL,
      reference_id INTEGER,
      is_claimed INTEGER DEFAULT 0,
      claimed_by_mentor_id ${isPG ? 'VARCHAR(255)' : 'TEXT'},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_assignments_student ON mentor_assignments(student_id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_student ON roadmap(student_id);
  `;

  if (isPG) {
    await pool.query(schema);

    const syncPostgresSchema = async () => {
      console.log('🌐 Checking Online (Postgres) Database Schema...');
      try {
        const res = await pool.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'id'
        `);
        
        if (res.rows.length > 0 && res.rows[0].data_type === 'integer') {
          console.log('🔄 Old Integer IDs detected. Purging legacy tables to perform clean UUID schema install...');
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            const tables = [
                'mentor_assignments', 'roadmap', 'student_skills', 
                'exam_submissions', 'notifications', 'mentor_notifications',
                'questions', 'exams', 'courses', 'users', 'mentors'
            ];
            for (const table of tables) {
                await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            }
            await client.query('COMMIT');
            console.log('✅ Legacy schemas purged. Re-initializing UUID schemas...');
            await pool.query(schema);
          } catch (err) {
            await client.query('ROLLBACK');
            throw err;
          } finally { client.release(); }
        }
      } catch (e) {
        console.error('⚠️ Online Migration Warning (ID Casts):', e.message);
      }

      // ─── ENSURE NEW COLUMNS EXIST INDEPENDENTLY ───
      const safeAlters = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS qualification TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE",
        "ALTER TABLE mentors ADD COLUMN IF NOT EXISTS first_name TEXT",
        "ALTER TABLE mentors ADD COLUMN IF NOT EXISTS last_name TEXT",
        "ALTER TABLE mentors ADD COLUMN IF NOT EXISTS qualification TEXT",
        "ALTER TABLE mentors ADD COLUMN IF NOT EXISTS username TEXT UNIQUE",
        "ALTER TABLE student_skills ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending Review'",
        "ALTER TABLE student_skills ADD COLUMN IF NOT EXISTS mentor_remarks TEXT",
        "ALTER TABLE student_skills ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS mentor_id VARCHAR(255) REFERENCES users(id)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'awaiting_review'",
        "UPDATE users SET status = 'active' WHERE id IN (SELECT student_id FROM roadmap) AND status = 'awaiting_review'"
      ];

      for (const query of safeAlters) {
        try {
          await pool.query(query);
        } catch (alterErr) {
          console.error(`⚠️ Failed to add column via: ${query}`, alterErr.message);
        }
      }
    };
    await syncPostgresSchema();
  } else {
    sqlite.exec(schema);

    // ─── SQLITE SELF-HEALING MIGRATION ───
    // If tables are empty but have the old 'INTEGER' types for UUID columns,
    // we drop them so they get recreated with the correct 'TEXT' types.
    const tablesToFix = ['student_skills', 'exam_submissions', 'roadmap', 'mentor_assignments', 'notifications', 'mentor_notifications'];
    tablesToFix.forEach(table => {
      try {
        const info = sqlite.prepare(`PRAGMA table_info(${table})`).all();
        const studentIdCol = info.find(c => c.name === 'student_id' || c.name === 'mentor_id');
        if (studentIdCol && studentIdCol.type === 'INTEGER') {
          const count = sqlite.prepare(`SELECT count(*) as count FROM ${table}`).get().count;
          if (count === 0) {
            console.log(`🛠️ Repairing SQLite table schema: ${table}`);
            sqlite.exec(`DROP TABLE ${table}`);
          }
        }
      } catch (e) {}
    });
    // Re-run schema to create any dropped tables
    sqlite.exec(schema);

    // Add columns for existing users
    try { sqlite.prepare("ALTER TABLE users ADD COLUMN first_name TEXT").run(); } catch (e) {}
    try { sqlite.prepare("ALTER TABLE users ADD COLUMN last_name TEXT").run(); } catch (e) {}
    try { sqlite.prepare("ALTER TABLE users ADD COLUMN qualification TEXT").run(); } catch (e) {}
    try { sqlite.prepare("ALTER TABLE users ADD COLUMN username TEXT").run(); } catch (e) {}
    
    // Add columns for existing mentors
    try { sqlite.prepare("ALTER TABLE mentors ADD COLUMN first_name TEXT").run(); } catch (e) {}
    try { sqlite.prepare("ALTER TABLE mentors ADD COLUMN last_name TEXT").run(); } catch (e) {}
    try { sqlite.prepare("ALTER TABLE mentors ADD COLUMN qualification TEXT").run(); } catch (e) {}
    try { sqlite.prepare("ALTER TABLE mentors ADD COLUMN username TEXT").run(); } catch (e) {}

    try { sqlite.prepare("ALTER TABLE users ADD COLUMN mentor_id INTEGER REFERENCES users(id)").run(); } catch (e) {}
    try { sqlite.prepare("ALTER TABLE student_skills ADD COLUMN status TEXT DEFAULT 'Pending Review'").run(); } catch (e) {}
    try { sqlite.prepare("ALTER TABLE student_skills ADD COLUMN mentor_remarks TEXT").run(); } catch (e) {}
    try { sqlite.prepare("ALTER TABLE student_skills ADD COLUMN reviewed_at DATETIME").run(); } catch (e) {}  
    try { sqlite.prepare("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1").run(); } catch (e) {}
    try { sqlite.prepare("ALTER TABLE mentors ADD COLUMN is_active INTEGER DEFAULT 1").run(); } catch (e) {}
    try { sqlite.prepare("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'awaiting_review'").run(); } catch (e) {}
    try { sqlite.prepare("UPDATE users SET status = 'active' WHERE id IN (SELECT student_id FROM roadmap)").run(); } catch (e) {}
  }
}

async function run(sql, params = []) {
  if (isPG) {
    return pool.query(fixSql(sql), params);
  }
  return sqlite.prepare(sql).run(...params);
}

async function get(sql, params = []) {
  if (isPG) {
    const res = await pool.query(fixSql(sql), params);
    return res.rows[0];
  }
  return sqlite.prepare(sql).get(...params);
}

async function all(sql, params = []) {
  if (isPG) {
    const res = await pool.query(fixSql(sql), params);
    return res.rows;
  }
  return sqlite.prepare(sql).all(...params);
}

async function runGetId(sql, params = []) {
  if (isPG) {
    const finalSql = fixSql(sql) + " RETURNING id";
    const res = await pool.query(finalSql, params);
    return res.rows[0].id;
  }
  const result = sqlite.prepare(sql).run(...params);
  return result.lastInsertRowid;
}

function getDb() { return isPG ? pool : sqlite; }
function saveToDisk() {}

const { createClient } = require('@supabase/supabase-js');
let supabaseAdmin = null;

// Standard Keys for Backend
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Defensive initialization: only boot Supabase if a valid URL is present
if (supabaseUrl && supabaseUrl.startsWith('http') && supabaseServiceKey) {
  supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  console.log('⚡ Supabase Admin (Service Role) initialized');
} else {
  console.log('⚠️ Supabase Admin NOT initialized: Missing or invalid SUPABASE_URL in Render environment');
}

module.exports = { initDb, getDb, run, get, all, runGetId, saveToDisk, isPG, supabaseAdmin };
