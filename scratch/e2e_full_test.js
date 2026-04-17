const https = require('https');
const API_URL = 'https://mentor-app-backend-w6bk.onrender.com/api';

let passed = 0, failed = 0;

function log(msg, ok = true) {
    const icon = ok ? '✅' : '❌';
    if (ok) passed++; else failed++;
    console.log(`${icon} ${msg}`);
}

async function fetchAPI(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_URL + endpoint);
        const body = options.body ? JSON.stringify(options.body) : null;
        const reqOptions = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': body ? Buffer.byteLength(body) : 0,
                ...(options.headers || {})
            }
        };
        const req = https.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) reject({ status: res.statusCode, ...parsed });
                    else resolve(parsed);
                } catch (e) {
                    if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    else resolve(data);
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function runTest() {
    console.log('\n🚀 =========================================');
    console.log('   MENTORCONNECT FULL E2E TEST SUITE');
    console.log('==========================================\n');

    const ts = Date.now();
    const learnerEmail = `e2e_learner_${ts}@test.com`;
    const mentorEmail = `e2e_mentor_${ts}@test.com`;
    let learnerToken, mentorToken, learnerId, mentorId;

    // ─── STEP 1: Register Learner ───
    console.log('STEP 1: Register Learner');
    try {
        const res = await fetchAPI('/auth/register', {
            method: 'POST',
            body: { name: 'E2E Test Learner', email: learnerEmail, password: 'Password123!' }
        });
        learnerId = res.user.id;
        log(`Learner registered (ID: ${learnerId})`);
    } catch (e) { log(`Register learner failed: ${JSON.stringify(e)}`, false); return; }

    // ─── STEP 2: Register Mentor ───
    console.log('\nSTEP 2: Register Mentor');
    try {
        const res = await fetchAPI('/auth/register', {
            method: 'POST',
            body: { name: 'E2E Test Mentor', email: mentorEmail, password: 'Password123!', role: 'mentor' }
        });
        mentorId = res.user.id;
        log(`Mentor registered (ID: ${mentorId})`);
    } catch (e) { log(`Register mentor failed: ${JSON.stringify(e)}`, false); return; }

    // ─── STEP 3: Login Learner ───
    console.log('\nSTEP 3: Login Learner');
    try {
        const res = await fetchAPI('/auth/login', {
            method: 'POST',
            body: { email: learnerEmail, password: 'Password123!' }
        });
        learnerToken = res.token;
        log(`Learner logged in`);
    } catch (e) { log(`Learner login failed: ${JSON.stringify(e)}`, false); return; }

    // ─── STEP 4: Login Mentor ───
    console.log('\nSTEP 4: Login Mentor');
    try {
        const res = await fetchAPI('/auth/login', {
            method: 'POST',
            body: { email: mentorEmail, password: 'Password123!' }
        });
        mentorToken = res.token;
        log(`Mentor logged in`);
    } catch (e) { log(`Mentor login failed: ${JSON.stringify(e)}`, false); return; }

    // ─── STEP 5: Submit Skills Assessment ───
    console.log('\nSTEP 5: Learner submits Skills Assessment');
    try {
        await fetchAPI('/student/skills', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${learnerToken}` },
            body: { goal: 'Full Stack Developer', skills: ['React', 'Node.js', 'Python'] }
        });
        log(`Skills assessment submitted`);
    } catch (e) { log(`Skills submission failed: ${JSON.stringify(e)}`, false); return; }

    // ─── STEP 6: Check Alerts ───
    console.log('\nSTEP 6: Mentor checks Alerts');
    try {
        const alerts = await fetchAPI('/mentor/notifications', {
            headers: { 'Authorization': `Bearer ${mentorToken}` }
        });
        const learnerAlert = alerts.find(a => a.student_id === learnerId);
        if (learnerAlert) {
            log(`Learner appears in mentor alerts (trigger: ${learnerAlert.trigger_type})`);
        } else {
            log(`Learner NOT found in alerts (total alerts: ${alerts.length})`, false);
            console.log('   All alert student_ids:', alerts.map(a => a.student_id));
        }
    } catch (e) { log(`Fetching alerts failed: ${JSON.stringify(e)}`, false); }

    // ─── STEP 7: Mentor Connects ───
    console.log('\nSTEP 7: Mentor connects to Learner');
    try {
        const res = await fetchAPI(`/mentor/connect/${learnerId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${mentorToken}` }
        });
        log(`Connection successful: ${res.message}`);
    } catch (e) { log(`Connect failed: ${JSON.stringify(e)}`, false); return; }

    // ─── STEP 8: Check Dashboard ───
    console.log('\nSTEP 8: Mentor Dashboard shows connected Learner');
    try {
        const dashboard = await fetchAPI(`/mentor/my-students?t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${mentorToken}` }
        });
        const found = dashboard.find(s => s.id === learnerId);
        if (found) {
            log(`Learner appears in Mentor Dashboard! (name: ${found.name}, has_roadmap: ${found.has_roadmap})`);
        } else {
            log(`Learner NOT in dashboard (total on dashboard: ${dashboard.length})`, false);
            console.log('   Dashboard IDs:', dashboard.map(s => s.id));
        }
    } catch (e) { log(`Dashboard fetch failed: ${JSON.stringify(e)}`, false); }

    // ─── SUMMARY ───
    console.log('\n==========================================');
    console.log(`   RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==========================================\n');
    if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED! Backend flow is working end-to-end.');
    } else {
        console.log('⚠️  Some tests failed. See details above.');
    }
}

runTest();
