const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const db = new Database('mentor_app.db');

const JWT_SECRET = 'mentor_app_jwt_secret_key_2024';

// 1. Create Test Mentor
const mentorId = 'test-mentor-uuid-' + Date.now();
db.prepare("INSERT OR REPLACE INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, 'mentor', 'test')")
  .run(mentorId, 'Test Mentor', 'test-mentor@test.com');
db.prepare("INSERT OR REPLACE INTO mentors (id, name, email) VALUES (?, ?, ?)")
  .run(mentorId, 'Test Mentor', 'test-mentor@test.com');

const mentorToken = jwt.sign({ id: mentorId, email: 'test-mentor@test.com', role: 'mentor' }, JWT_SECRET);

console.log(`✅ Test Mentor Created: ${mentorId}`);

// 2. Create 2 Learners
const learner1Id = 'l1-' + Date.now();
const learner2Id = 'l2-' + Date.now();

[learner1Id, learner2Id].forEach((id, i) => {
    db.prepare("INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, 'learner', 'test')")
      .run(id, `Learner ${i+1}`, `learner${i+1}@test.com`);
    console.log(`✅ Learner ${i+1} Created: ${id}`);
});

// 3. Submit Skills Assessment for Learners
[learner1Id, learner2Id].forEach((id, i) => {
    const skillsId = db.prepare("INSERT INTO student_skills (student_id, goal, skills) VALUES (?, ?, ?)")
      .run(id, `Become a ${i === 0 ? 'Cloud Architect' : 'Project Manager'}`, JSON.stringify(['AWS', 'Docker']));
    
    // Create notification
    db.prepare("INSERT INTO mentor_notifications (student_id, trigger_type, reference_id) VALUES (?, 'skills', ?)")
      .run(id, skillsId.lastInsertRowid);
    
    console.log(`✅ Skills Submitted for Learner ${i+1}`);
});

// 4. Submit Exams for Learners
[learner1Id, learner2Id].forEach((id, i) => {
    const submissionId = db.prepare("INSERT INTO exam_submissions (student_id, exam_id, status) VALUES (?, 1, 'Submitted')")
      .run(id);
    
    // Create notification
    db.prepare("INSERT INTO mentor_notifications (student_id, trigger_type, reference_id) VALUES (?, 'exam', ?)")
      .run(id, submissionId.lastInsertRowid);
      
    console.log(`✅ Exam Submitted for Learner ${i+1}`);
});

// 5. Verify Notifications
const notifications = db.prepare(`
    SELECT mn.id, u.name as student_name 
    FROM mentor_notifications mn 
    JOIN users u ON u.id = mn.student_id 
    WHERE mn.is_claimed = 0
`).all();
console.log(`📋 Notifications Pending: ${notifications.length}`);

// 6. Connect with Learners (Simulating /api/mentor/connect)
[learner1Id, learner2Id].forEach(sid => {
    // Atomic connect logic
    db.prepare("INSERT INTO mentor_assignments (mentor_id, student_id, mentor_user_id) VALUES (?, ?, ?)")
      .run(mentorId, sid, mentorId);
    db.prepare("UPDATE users SET mentor_id = ? WHERE id = ?").run(mentorId, sid);
    db.prepare("UPDATE mentor_notifications SET is_claimed = 1, claimed_by_mentor_id = ? WHERE student_id = ?")
      .run(mentorId, sid);
    console.log(`🔗 Connected with ${sid}`);
});

// 7. Final Verification: Check Dashboard Query Logic
const roster = db.prepare(`
    SELECT DISTINCT u.id, u.name, u.mentor_id as direct_mentor_id,
           ma.mentor_user_id, ma.mentor_id as legacy_mentor_id,
           EXISTS(SELECT 1 FROM roadmap r WHERE r.student_id = u.id) as has_roadmap
    FROM users u
    LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
    WHERE u.mentor_id = ? 
       OR ma.mentor_user_id = ?
       OR (ma.mentor_id IS NOT NULL AND ma.mentor_id = ?)
`).all(mentorId, mentorId, mentorId);

console.log('--- FINAL DASHBOARD VERIFICATION ---');
console.log(`📊 Roster Count: ${roster.length}`);
roster.forEach(r => console.log(`  - ${r.name} (ID: ${r.id})`));

if (roster.length === 2) {
    console.log('✨ SUCCESS: Both learners are visible on the dashboard!');
} else {
    console.log('❌ FAILURE: Roster count mismatch.');
}

db.close();
