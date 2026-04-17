const db = require('./db');

async function cleanupOrphans() {
    console.log('🧹 Starting Orphan Cleanup (Supabase Auth → Local DB Sync)...');
    
    try {
        await db.initDb();
        if (!db.supabaseAdmin) throw new Error('Supabase Admin not initialized. Check your environment variables.');

        // 1. Fetch all local users that are managed by Cloud Auth
        const localCloudUsers = await db.all("SELECT id, email FROM users WHERE password_hash = 'CLOUD_AUTH'");
        console.log(`📊 Found ${localCloudUsers.length} cloud-managed users in local database.`);

        let deletedCount = 0;

        for (const user of localCloudUsers) {
            // 2. Check existence in Supabase Auth
            const { data, error } = await db.supabaseAdmin.auth.admin.getUserById(user.id);
            
            // Note: error.status === 404 or !data means they are gone from Supabase
            if (error || !data) {
                console.log(`⚠️ Orphan detected: ${user.email} (${user.id}). Purging local records...`);
                
                // 3. Delete from local DB. 
                // Because we've added ON DELETE CASCADE to db.js, this will automatically 
                // purge their roadmap, assessments, and notifications.
                await db.run('DELETE FROM users WHERE id = ?', [user.id]);
                deletedCount++;
            }
        }

        console.log(`\n✅ Cleanup complete. ${deletedCount} orphan records removed.`);
        process.exit(0);
    } catch (e) {
        console.error('❌ Cleanup failed:', e.message);
        process.exit(1);
    }
}

cleanupOrphans();
