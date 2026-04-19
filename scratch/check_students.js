const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '..', 'mentor_app.db');
const db = new Database(dbPath);

console.log('--- students with mentor_id in users table ---');
const students = db.prepare("SELECT id, name, email, mentor_id FROM users WHERE mentor_id IS NOT NULL").all();
console.log(JSON.stringify(students, null, 2));

console.log('\n--- mentor_assignments check ---');
const assignments = db.prepare('SELECT * FROM mentor_assignments').all();
console.log(JSON.stringify(assignments, null, 2));

db.close();
