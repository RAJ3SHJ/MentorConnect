const { all } = require('../db');

async function check() {
    try {
        console.log('--- Mentor Notifications (Unclaimed) ---');
        const notifications = await all(`
            SELECT mn.id, mn.student_id, mn.is_claimed, u.name, ma.id as assignment_id
            FROM mentor_notifications mn
            JOIN users u ON u.id = mn.student_id
            LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
            WHERE mn.is_claimed = 0
        `);
        console.table(notifications);

        console.log('\n--- All Mentor Assignments ---');
        const assignments = await all('SELECT * FROM mentor_assignments');
        console.table(assignments);
    } catch (e) {
        console.error(e);
    }
}

check();
