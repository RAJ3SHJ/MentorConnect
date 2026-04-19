const { all, get } = require('../db');

async function testQuery() {
    try {
        // We'll use a real mentor ID from the database to test
        const mentor = await get("SELECT id, email FROM users WHERE mentor_id IS NOT NULL LIMIT 1");
        if (!mentor) {
            console.log("No mentor found for testing.");
            return;
        }
        const mentorUserId = 'af2ee0a4-3bee-4ed2-b1a9-6267a5f84fd6';
        console.log(`Simulating query for Mentor: Auto Mentor (${mentorUserId})`);

        const notifications = await all(`
            SELECT mn.id, mn.student_id, mn.trigger_type, u.name AS student_name,
                   (CASE WHEN ma.mentor_user_id = ? OR u.mentor_id = ? THEN 1 ELSE 0 END) as is_connected_to_me,
                   ma.mentor_user_id as claimed_by_uid,
                   u.mentor_id as user_table_mentor_id
            FROM mentor_notifications mn
            JOIN users u ON u.id = mn.student_id
            LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
            WHERE mn.is_claimed = 0 
              AND (ma.id IS NULL OR ma.mentor_user_id = ? OR u.mentor_id = ?)
            ORDER BY mn.created_at DESC
        `, [mentorUserId, mentorUserId, mentorUserId, mentorUserId]);

        console.log("Query Results:");
        console.table(notifications);

    } catch (e) {
        console.error(e);
    }
}

testQuery();
