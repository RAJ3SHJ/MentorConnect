const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'mentor_app.db');

let db;

function getDb() {
  return db;
}

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Run schema
  db.run(`
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
      UNIQUE(student_id)
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      link TEXT,
      category TEXT,
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
  `);

  // Migration: add role column if missing
  try {
    db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'learner'");
  } catch (e) { /* column already exists */ }

  // Migration: add mentor_id to notifications if missing
  try {
    db.run("ALTER TABLE notifications ADD COLUMN mentor_id INTEGER");
  } catch (e) { /* column already exists */ }

  // Migration: Phase 3 Quantum Update - Add mentor_id to users
  try {
    db.run("ALTER TABLE users ADD COLUMN mentor_id INTEGER REFERENCES users(id)");
  } catch (e) { /* column already exists */ }

  // Migration: Phase 3 Quantum Update - Add created_by fields to courses
  try {
    db.run("ALTER TABLE courses ADD COLUMN created_by_role TEXT");
    db.run("ALTER TABLE courses ADD COLUMN created_by_id INTEGER");
  } catch (e) { /* columns already exist */ }

  saveToDisk();
  console.log('✅ Database initialized at', DB_PATH);
}

function saveToDisk() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Helper: run a write query and save to disk
function run(sql, params = []) {
  db.run(sql, params);
  saveToDisk();
  return db;
}

// Helper: get a single row
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// Helper: get all rows
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: get lastInsertRowid
function runGetId(sql, params = []) {
  db.run(sql, params);
  const idRow = get('SELECT last_insert_rowid() as id');
  saveToDisk();
  return idRow ? idRow.id : null;
}

module.exports = { initDb, getDb, run, get, all, runGetId, saveToDisk };
