const { all } = require('../db');

async function check() {
    try {
        console.log('--- Users with Mentor ID ---');
        const users = await all('SELECT id, name, mentor_id FROM users WHERE mentor_id IS NOT NULL');
        console.table(users);
    } catch (e) {
        console.error(e);
    }
}

check();
