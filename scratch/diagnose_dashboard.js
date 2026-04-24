const { get, all } = require('../db');

async function diagnose() {
    console.log('🔍 Starting Dashboard Diagnosis...\n');
    
    try {
        // 1. Identify Mentor "bose"
        const boseUser = await get("SELECT id, name, email FROM users WHERE (email = 'bose' OR username = 'bose')");
        if (!boseUser) {
            console.log('❌ Mentor "bose" not found in users table.');
        } else {
            console.log(`✅ Mentor Found: ${boseUser.name} (ID: ${boseUser.id})`);
        }

        // 2. Check for assigned students
        const assignments = await all("SELECT * FROM mentor_assignments WHERE mentor_user_id = ?", [boseUser ? boseUser.id : '']);
        console.log(`\n📋 Mentor Assignments (${assignments.length}):`);
        assignments.forEach(a => console.log(`   - Student ID: ${a.student_id}`));

        // 3. Check exam_submissions for those students
        const submissions = await all(`
            SELECT es.student_id, es.status, u.name as student_name
            FROM exam_submissions es
            JOIN users u ON u.id = es.student_id
            WHERE es.status = 'pending_roadmap'
        `);
        console.log(`\n🔗 Students with 'pending_roadmap' status (${submissions.length}):`);
        submissions.forEach(s => console.log(`   - ${s.student_name} (${s.student_id}): Status = ${s.status}`));

        // 4. Check why Bose might not see them
        if (boseUser) {
            const dashboardQuery = await all(`
                SELECT u.id, u.name, es.status
                FROM users u
                JOIN exam_submissions es ON es.student_id = u.id
                LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
                WHERE (ma.mentor_user_id = ? OR u.mentor_id = ?)
                AND es.status = 'pending_roadmap'
            `, [boseUser.id, boseUser.id]);
            
            console.log(`\n🏠 Dashboard Roster for Bose (${dashboardQuery.length}):`);
            dashboardQuery.forEach(d => console.log(`   - ${d.name}: ${d.status}`));
            
            if (dashboardQuery.length === 0 && submissions.length > 0) {
                console.log('\n⚠️  POTENTIAL ISSUE: There are students in "pending_roadmap" state, but they are NOT assigned to Bose!');
            }
        }

    } catch (e) {
        console.error('❌ Diagnosis Error:', e.message);
    }
    process.exit(0);
}

diagnose();
