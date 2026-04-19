const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '..', 'mentor_app.db');
const db = new Database(dbPath);

const mentorId = 'a6500bff-30e8-4b52-bd67-6f52b91e3e26'; // James C

console.log('--- Testing inclusive query for James C ---');

const sql = `
    SELECT u.id, u.name, u.email, u.created_at, 
           COALESCE(ma.assigned_at, u.created_at) as assigned_at,
           EXISTS(SELECT 1 FROM roadmap r WHERE r.student_id = u.id) as has_roadmap
    FROM users u
    LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
    WHERE u.mentor_id = ? OR ma.mentor_user_id = ?
    ORDER BY assigned_at DESC
`;

const students = db.prepare(sql).all(mentorId, mentorId);
console.log('Students found:', students.length);
console.log(JSON.stringify(students, null, 2));

db.close();
