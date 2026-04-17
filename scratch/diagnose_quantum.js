const https = require('https');
const API_URL = 'https://mentor-app-backend-w6bk.onrender.com/api';

function fetchAPI(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_URL + endpoint);
        const body = options.body ? JSON.stringify(options.body) : null;
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: { 'Content-Type': 'application/json', 'Content-Length': body ? Buffer.byteLength(body) : 0, ...(options.headers || {}) }
        }, res => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function run() {
    console.log('=== QUANTUM MENTOR DIAGNOSTIC ===\n');

    // 1. Login as Quantum Mentor
    const login = await fetchAPI('/auth/quantum-login', { method: 'POST', body: { pin: '1234', role: 'mentor' } });
    const token = login.token;
    console.log('Quantum Mentor ID:', login.user.id);
    console.log('Quantum Mentor Email:', login.user.email);

    // 2. Register a fresh learner
    const ts = Date.now();
    const learnerEmail = `diag_learner_${ts}@test.com`;
    const reg = await fetchAPI('/auth/register', { method: 'POST', body: { name: 'Diag Learner', email: learnerEmail, password: 'Password123!' } });
    console.log('\nFresh Learner ID:', reg.user.id);
    const learnerToken = (await fetchAPI('/auth/login', { method: 'POST', body: { email: learnerEmail, password: 'Password123!' } })).token;

    // 3. Submit skills for learner
    await fetchAPI('/student/skills', { method: 'POST', headers: { 'Authorization': `Bearer ${learnerToken}` }, body: { goal: 'Diag Goal', skills: ['A', 'B'] } });
    console.log('Skills submitted');

    // 4. Check Dashboard BEFORE connect
    const before = await fetchAPI(`/mentor/my-students?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const foundBefore = before.find ? before.find(s => s.id === reg.user.id) : null;
    console.log('\nDashboard BEFORE connect - learner present:', !!foundBefore);

    // 5. Connect
    const conn = await fetchAPI(`/mentor/connect/${reg.user.id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    console.log('Connect result:', conn.message || conn.error);

    // 6. Check Dashboard AFTER connect
    const after = await fetchAPI(`/mentor/my-students?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const foundAfter = Array.isArray(after) ? after.find(s => s.id === reg.user.id) : null;
    console.log('Dashboard AFTER connect - learner present:', !!foundAfter);
    
    if (foundAfter) {
        console.log('  Learner data:', JSON.stringify(foundAfter, null, 2));
        console.log('\n✅ BACKEND IS WORKING - Issue is frontend only');
    } else {
        console.log('\n❌ BACKEND ISSUE - Learner not returned by my-students');
        console.log('Total learners returned:', Array.isArray(after) ? after.length : 'ERROR:', after);
    }
}

run().catch(console.error);
