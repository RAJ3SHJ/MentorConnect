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
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'learner',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentors (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      expertise TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentor_assignments (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      mentor_id INTEGER REFERENCES users(id),
      student_id INTEGER REFERENCES users(id),
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      mentor_user_id INTEGER REFERENCES users(id),
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
      student_id INTEGER REFERENCES users(id),
      course_id INTEGER REFERENCES courses(id),
      status TEXT DEFAULT 'Yet to Start',
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS student_skills (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      student_id INTEGER REFERENCES users(id) UNIQUE,
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
      student_id INTEGER REFERENCES users(id),
      exam_id INTEGER REFERENCES exams(id),
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
      student_id INTEGER REFERENCES users(id),
      mentor_id INTEGER,
      reference_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentor_notifications (
      id ${isPG ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPG ? '' : 'AUTOINCREMENT'},
      student_id INTEGER REFERENCES users(id),
      trigger_type TEXT NOT NULL,
      reference_id INTEGER,
      is_claimed INTEGER DEFAULT 0,
      claimed_by_mentor_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_assignments_student ON mentor_assignments(student_id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_student ON roadmap(student_id);
  `;

  if (isPG) {
    await pool.query(schema);
    // Pg doesn't support ALTER TABLE with multiple IF NOT EXISTS easily here, keep it simple
    try { await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS mentor_id INTEGER REFERENCES users(id)"); } catch (e) {}
  } else {
    sqlite.exec(schema);
    try { sqlite.prepare("ALTER TABLE users ADD COLUMN mentor_id INTEGER REFERENCES users(id)").run(); } catch (e) {}
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
