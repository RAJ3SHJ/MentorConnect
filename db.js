const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'mentor_app.db');

// Initialize database with better-sqlite3
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency (crucial for 150+ users)
db.pragma('journal_mode = WAL');

function getDb() {
  return db;
}

async function initDb() {
  // Run schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'learner',
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mentors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      expertise TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mentor_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mentor_id INTEGER REFERENCES users(id),
      student_id INTEGER REFERENCES users(id),
      assigned_at DATETIME DEFAULT (datetime('now')),
      mentor_user_id INTEGER REFERENCES users(id),
      UNIQUE(student_id)
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      link TEXT,
      category TEXT,
      created_by_role TEXT,
      created_by_id INTEGER,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS roadmap (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES users(id),
      course_id INTEGER REFERENCES courses(id),
      status TEXT DEFAULT 'Yet to Start',
      assigned_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS student_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES users(id) UNIQUE,
      goal TEXT,
      skills TEXT,
      submitted_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER REFERENCES exams(id),
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exam_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES users(id),
      exam_id INTEGER REFERENCES exams(id),
      answers TEXT,
      status TEXT DEFAULT 'Pending Review',
      mentor_remarks TEXT,
      rating INTEGER,
      verdict TEXT,
      submitted_at DATETIME DEFAULT (datetime('now')),
      reviewed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      student_id INTEGER REFERENCES users(id),
      mentor_id INTEGER,
      reference_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mentor_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES users(id),
      trigger_type TEXT NOT NULL,
      reference_id INTEGER,
      is_claimed INTEGER DEFAULT 0,
      claimed_by_mentor_id INTEGER,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    -- SCALING INDEXES
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_assignments_student ON mentor_assignments(student_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_mentor_user ON mentor_assignments(mentor_user_id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_student ON roadmap(student_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_student ON exam_submissions(student_id);
    CREATE INDEX IF NOT EXISTS idx_mentor_notif_claimed ON mentor_notifications(is_claimed);
  `);

  // Migrations (for backwards compatibility if file exists)
  try { db.prepare("ALTER TABLE users ADD COLUMN mentor_id INTEGER REFERENCES users(id)").run(); } catch (e) {}
  
  console.log('✅ Database initialized and optimized at', DB_PATH);
}

// Helper: run a write query
function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

// Helper: get a single row
function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

// Helper: get all rows
function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

// Helper: get lastInsertRowid
function runGetId(sql, params = []) {
  const result = db.prepare(sql).run(...params);
  return result.lastInsertRowid;
}

// saveToDisk is no longer needed as better-sqlite3 writes directly to the file
function saveToDisk() {
  // Placeholder for compatibility
}

module.exports = { initDb, getDb, run, get, all, runGetId, saveToDisk };
