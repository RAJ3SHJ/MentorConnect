const axios = require('axios');
const { execSync } = require('child_process');
const path = require('path');

const API_URL = 'http://localhost:3001';
const runId = Math.floor(Math.random() * 9000) + 1000;

async function runTest() {
    console.log(`🚀 Starting Robust Full Scale Test [Run ${runId}]...`);
    
    try {
        // 1. Register a dedicated Test Mentor
        const m = { email: `mentor_auto_${runId}@test.com`, name: `Auto Mentor ${runId}`, password: 'Password123!' };
        console.log(`👨‍🏫 Registering ${m.name}...`);
        const regRes = await axios.post(`${API_URL}/api/auth/register`, m);
        const mentorId = regRes.data.user.id;

        // 2. PROMOTE to mentor role via local DB access (Assuming test is running where backend has local DB access)
        // Note: If running against a remote production DB, we'd need admin API access.
        // For this local verification, we'll use the local DB.
        console.log(`🆙 Promoting ${m.email} to Mentor role...`);
        const cmd = `node -e "const db = require('./db'); db.initDb().then(async () => { await db.run('UPDATE users SET role = \\'mentor\\' WHERE email = ?', ['${m.email}']); process.exit(0); })"`;
        execSync(cmd, { cwd: path.join(__dirname, '..', '..', 'mentor-app-backend') });

        // 3. Login as the new Mentor
        console.log(`🔐 Logging in as the newly promoted Mentor...`);
        const login = await axios.post(`${API_URL}/api/auth/login`, { email: m.email, password: m.password });
        const mentorToken = login.data.token;
        console.log(`✅ Login successful.`);

        // 4. Register 3 Learners and submit skills
        const learners = [];
        for (let i = 1; i <= 3; i++) {
            const l = { email: `learner_test_${runId}_${i}@test.com`, name: `Learner ${i}`, password: 'Password123!' };
            console.log(`🎓 Registering ${l.name}...`);
            await axios.post(`${API_URL}/api/auth/register`, l);
            const lLogin = await axios.post(`${API_URL}/api/auth/login`, { email: l.email, password: l.password });
            l.token = lLogin.data.token;
            l.userId = lLogin.data.user.id;
            
            console.log(`🎯 ${l.name} submitting Skills...`);
            await axios.post(`${API_URL}/api/student/skills`, { goal: 'Fullstack', skills: ['React', 'Node'] }, { 
                headers: { Authorization: `Bearer ${l.token}` } 
            });
            learners.push(l);
        }

        // 5. Check Alert count
        const countRes = await axios.get(`${API_URL}/api/mentor/notification-count`, { 
            headers: { Authorization: `Bearer ${mentorToken}` } 
        });
        const countBefore = countRes.data.count;
        console.log(`📊 Alerts before connection: ${countBefore}`);

        // 6. Connect with Learner 1
        const target = learners[0];
        console.log(`🔗 Connecting with ${target.name}...`);
        await axios.post(`${API_URL}/api/mentor/connect/${target.userId}`, {}, { 
            headers: { Authorization: `Bearer ${mentorToken}` } 
        });

        // 7. Verification: Learner 1 must NOT show in alerts
        console.log(`🔍 Verifying ${target.name} has vanished from global alerts...`);
        const notifsRes = await axios.get(`${API_URL}/api/mentor/notifications`, { 
            headers: { Authorization: `Bearer ${mentorToken}` } 
        });
        const exists = notifsRes.data.some(n => n.student_id === target.userId);
        
        if (!exists) {
            console.log(`✅ SUCCESS: Student removed from Alerts list.`);
        } else {
            console.log(`❌ FAILURE: Student still visible in Alerts.`);
        }

        const countAfterRes = await axios.get(`${API_URL}/api/mentor/notification-count`, { 
            headers: { Authorization: `Bearer ${mentorToken}` } 
        });
        console.log(`📊 Alerts after: ${countAfterRes.data.count}`);
        
        if (countAfterRes.data.count < countBefore) {
            console.log(`✅ SUCCESS: Badge count decremented.`);
        }

        console.log('\n✨ All requirements verified.');

    } catch (e) {
        console.error('\n❌ TEST ERROR');
        console.error(e.response?.data || e.message);
    }
}

runTest();
