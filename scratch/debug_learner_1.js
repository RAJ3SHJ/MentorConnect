const { all, get } = require('../db');

async function debug() {
    try {
        const name = 'New Test Learner 1 (indvzl)';
        console.log(`Checking learner: ${name}`);
        
        const user = await get("SELECT * FROM users WHERE name = ?", [name]);
        if (!user) {
            console.log("Learner not found by exact name. Searching with LIKE...");
            const users = await all("SELECT id, name, mentor_id FROM users WHERE name LIKE '%New Test Learner 1%'");
            console.table(users);
            return;
        }
        console.log("User Record:");
        console.table([user]);

        const assignments = await all("SELECT * FROM mentor_assignments WHERE student_id = ?", [user.id]);
        console.log("Mentor Assignments:");
        console.table(assignments);

        const notifications = await all("SELECT * FROM mentor_notifications WHERE student_id = ?", [user.id]);
        console.log("Mentor Notifications:");
        console.table(notifications);

    } catch (e) {
        console.error(e);
    }
}

debug();
