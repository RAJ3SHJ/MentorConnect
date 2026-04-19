const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '..', 'mentor_app.db');
const db = new Database(dbPath);

console.log('--- mentor_assignments ---');
const assignments = db.prepare('SELECT * FROM mentor_assignments').all();
console.log(JSON.stringify(assignments, null, 2));

console.log('\n--- mentors ---');
const mentors = db.prepare('SELECT * FROM mentors').all();
console.log(JSON.stringify(mentors, null, 2));

console.log('\n--- users (mentors) ---');
const mentorUsers = db.prepare("SELECT id, name, email, role FROM users WHERE role = 'mentor'").all();
console.log(JSON.stringify(mentorUsers, null, 2));

db.close();
