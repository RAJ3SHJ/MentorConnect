const https = require('https');

const API_URL = 'https://mentor-app-backend-w6bk.onrender.com/api';

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
        console.log('🚀 Starting Supabase Mentor E2E Test on Render...\n');

        const timestamp = Date.now();
        const learner = { name: 'Supa Learner', email: `supa_learner_${timestamp}@test.com`, password: 'Password123!' };
        const mentor = { name: 'Supa Mentor', email: `supa_mentor_${timestamp}@test.com`, password: 'Password123!', role: 'mentor' };

        // 1. Register Learner and Mentor
        console.log('📝 Registering Users...');
        const reg1 = await fetchAPI('/auth/register', { method: 'POST', body: learner });
        console.log(`✅ Learner Registered: ${reg1.user.id}`);
        const reg2 = await fetchAPI('/auth/register', { method: 'POST', body: mentor });
        console.log(`✅ Mentor Registered: ${reg2.user.id}`);

        // 2. Login
        console.log('\n🔐 Logging in...');
        const login1 = await fetchAPI('/auth/login', { method: 'POST', body: { email: learner.email, password: learner.password } });
        console.log(`✅ Learner Logged In`);
        
        const login2 = await fetchAPI('/auth/login', { method: 'POST', body: { email: mentor.email, password: mentor.password } });
        console.log(`✅ Mentor Logged In (ID: ${login2.user.id})`);

        // 3. Submit Skills
        console.log('\n🎯 Submitting Skills...');
        await fetchAPI('/student/skills', { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${login1.token}` },
            body: { goal: 'Supa Goal', skills: ['A', 'B'] }
        });
        console.log(`✅ Learner Skills Submitted`);

        // 4. Mentor Connect
        console.log('\n🤝 Connecting with Learner...');
        const conn1 = await fetchAPI(`/mentor/connect/${login1.user.id}`, { 
            method: 'POST',
            headers: { 'Authorization': `Bearer ${login2.token}` }
        });
        console.log(`✅ Connected to Learner: ${conn1.message}`);

        // 5. Verify Mentor Dashboard
        console.log('\n📊 Verifying Mentor Dashboard...');
        const dashboard = await fetchAPI('/mentor/my-students', { 
            headers: { 'Authorization': `Bearer ${login2.token}` }
        });
        
        console.log(`✅ Dashboard Roster:`);
        console.log(JSON.stringify(dashboard, null, 2));

    } catch (e) {
        console.error('\n❌ Test Failed:', e);
    }
}

runTest();
