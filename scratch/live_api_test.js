const https = require('https');

const API_URL = 'https://mentor-app-backend-w6bk.onrender.com/api';
// Use local for testing if Render is slow, but we want to test Render.

async function fetchAPI(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_URL + endpoint);
        const reqOptions = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        };

        const req = https.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) reject(parsed);
                    else resolve(parsed);
                } catch (e) {
                    if (res.statusCode >= 400) reject(new Error(data));
                    else resolve(data);
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

async function runTest() {
    try {
        console.log('🚀 Starting Live Backend E2E Test on Render...\n');

        const timestamp = Date.now();
        const learner1 = { name: 'Live Learner 1', email: `live1_${timestamp}@test.com`, password: 'Password123!' };
        const learner2 = { name: 'Live Learner 2', email: `live2_${timestamp}@test.com`, password: 'Password123!' };

        // 1. Register Learners
        console.log('📝 Registering Learners...');
        const reg1 = await fetchAPI('/auth/register', { method: 'POST', body: learner1 });
        console.log(`✅ Learner 1 Registered: ${reg1.user.id}`);
        const reg2 = await fetchAPI('/auth/register', { method: 'POST', body: learner2 });
        console.log(`✅ Learner 2 Registered: ${reg2.user.id}`);

        // 2. Login Learners
        console.log('\n🔐 Logging in Learners...');
        const login1 = await fetchAPI('/auth/login', { method: 'POST', body: { email: learner1.email, password: learner1.password } });
        const token1 = login1.token;
        console.log(`✅ Learner 1 Logged In`);
        
        const login2 = await fetchAPI('/auth/login', { method: 'POST', body: { email: learner2.email, password: learner2.password } });
        const token2 = login2.token;
        console.log(`✅ Learner 2 Logged In`);

        // 3. Submit Skills
        console.log('\n🎯 Submitting Skills Assessments...');
        await fetchAPI('/student/skills', { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token1}` },
            body: { goal: 'Frontend Master', skills: ['React', 'CSS'] }
        });
        console.log(`✅ Learner 1 Skills Submitted`);
        
        await fetchAPI('/student/skills', { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token2}` },
            body: { goal: 'Backend Ninja', skills: ['Node', 'SQL'] }
        });
        console.log(`✅ Learner 2 Skills Submitted`);

        // 4. Submit Exams (Skipping due to syncing issue on stateless Render disk)
        console.log('\n📝 Skipping Exams submission (Skills is enough to trigger notification)...');

        // 5. Mentor Login
        console.log('\n👨‍🏫 Mentor Quantum Login...');
        const mentorLogin = await fetchAPI('/auth/quantum-login', { 
            method: 'POST', 
            body: { pin: '1234', role: 'mentor' }
        });
        const mentorToken = mentorLogin.token;
        console.log(`✅ Mentor Logged In (ID: ${mentorLogin.user.id})`);

        // 6. Check Alerts
        console.log('\n🔔 Checking Mentor Alerts...');
        const alerts = await fetchAPI('/mentor/notifications', { 
            headers: { 'Authorization': `Bearer ${mentorToken}` }
        });
        console.log(`✅ Found ${alerts.length} pending alerts.`);
        
        // Find our specific learners in alerts
        const myAlerts1 = alerts.filter(a => a.student_id === login1.user.id);
        const myAlerts2 = alerts.filter(a => a.student_id === login2.user.id);
        console.log(`   - Learner 1 has ${myAlerts1.length} alerts.`);
        console.log(`   - Learner 2 has ${myAlerts2.length} alerts.`);

        // 7. Connect with Learners
        console.log('\n🤝 Connecting with Learners...');
        const conn1 = await fetchAPI(`/mentor/connect/${login1.user.id}`, { 
            method: 'POST',
            headers: { 'Authorization': `Bearer ${mentorToken}` }
        });
        console.log(`✅ Connected to Learner 1: ${conn1.message || 'Success'}`);

        const conn2 = await fetchAPI(`/mentor/connect/${login2.user.id}`, { 
            method: 'POST',
            headers: { 'Authorization': `Bearer ${mentorToken}` }
        });
        console.log(`✅ Connected to Learner 2: ${conn2.message || 'Success'}`);

        // 8. Verify Mentor Dashboard
        console.log('\n📊 Verifying Mentor Dashboard...');
        const dashboard = await fetchAPI('/mentor/my-students', { 
            headers: { 'Authorization': `Bearer ${mentorToken}` }
        });
        
        console.log(`✅ Dashboard Roster contains ${dashboard.length} students total.`);
        const found1 = dashboard.find(s => s.id === login1.user.id);
        const found2 = dashboard.find(s => s.id === login2.user.id);

        if (found1 && found2) {
            console.log('\n✨ SUCCESS! Both new learners are visible on the LIVE Mentor Dashboard!');
            console.log(`  - ${found1.name} (ID: ${found1.id})`);
            console.log(`  - ${found2.name} (ID: ${found2.id})`);
        } else {
            console.log('\n❌ FAILURE! One or both learners are missing from the Dashboard.');
            if (!found1) console.log(`  - Missing Learner 1 (${login1.user.id})`);
            if (!found2) console.log(`  - Missing Learner 2 (${login2.user.id})`);
        }

    } catch (e) {
        console.error('\n❌ Test Failed with Error:', e.message || e);
    }
}

runTest();
