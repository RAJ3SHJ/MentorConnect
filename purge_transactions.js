const db = require('./db');

async function purgeTransactions() {
    console.log('🚀 Starting Transaction Purge...');
    console.log(`📡 Database Type: ${db.isPG ? 'PostgreSQL (Render)' : 'SQLite (Local)'}`);
    
    try {
        await db.initDb();
        
        const tablesToClear = [
            'mentor_notifications',
            'notifications',
            'exam_submissions',
            'roadmap',
            'student_skills',
            'mentor_assignments'
        ];

        for (const table of tablesToClear) {
            console.log(`🧹 Clearing ${table}...`);
            // Using DELETE instead of TRUNCATE for compatibility and to handle foreign key cascades if any
            await db.run(`DELETE FROM ${table}`);
        }

        console.log('\n✅ Purge Complete.');
        
        // Verification counts
        const userCount = await db.get('SELECT count(*) as count FROM users');
        const courseCount = await db.get('SELECT count(*) as count FROM courses');
        const examCount = await db.get('SELECT count(*) as count FROM exams');
        
        console.log('\n📊 POST-PURGE STATUS:');
        console.log(`- Users Preserved: ${userCount.count}`);
        console.log(`- Courses Preserved: ${courseCount.count}`);
        console.log(`- Exams Preserved: ${examCount.count}`);
        console.log('----------------------------');
        
        process.exit(0);
    } catch (e) {
        console.error('❌ Purge Failed:', e.message);
        process.exit(1);
    }
}

purgeTransactions();
