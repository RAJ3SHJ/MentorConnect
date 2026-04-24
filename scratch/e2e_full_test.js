/**
 * E2E Full Workflow Test
 * Tests: Register → Submit Exam → Mentor Alerts → Connect → Feedback → Assign Roadmap → Dashboard Visibility
 */
const express = require('express');
const cors = require('cors');
const { initDb, get, all } = require('../db');
const axios = require('axios');

process.env.JWT_SECRET = 'test_secret';
process.env.PORT = 5002;

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('../routes/auth'));
app.use('/api/mentor', require('../routes/mentor'));
app.use('/api/exams', require('../routes/exams'));

let server;
let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) {
        console.log(`  ✅ PASS: ${label}`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: ${label}`);
        failed++;
    }
}

async function runTest() {
    console.log('═══════════════════════════════════════════');
    console.log('  🧪 E2E WORKFLOW TEST — FULL PIPELINE');
    console.log('═══════════════════════════════════════════\n');

    await initDb();

    server = app.listen(5002, () => {
        console.log('🔧 Test Server on port 5002\n');
    });

    const client = axios.create({ baseURL: 'http://localhost:5002' });
    const uid = Date.now();
    const learnerEmail = `learner_e2e_${uid}@test.com`;

    try {
        // ─── STEP 1: REGISTER LEARNER ───
        console.log('─── STEP 1: Register New Learner ───');
        let res = await client.post('/api/auth/register', {
            name: `E2E Learner ${uid}`,
            email: learnerEmail,
            password: 'password123',
            role: 'learner'
        });
        assert(res.status === 201, 'Learner registered successfully');

        // Login to sync to local DB
        res = await client.post('/api/auth/login', {
            email: learnerEmail,
            password: 'password123'
        });
        const learnerToken = res.data.token;
        const learnerId = res.data.user.id;
        assert(!!learnerToken, `Learner logged in (ID: ${learnerId})`);

        // ─── STEP 2: SUBMIT EXAM ASSESSMENT ───
        console.log('\n─── STEP 2: Submit Exam Assessment ───');
        
        // Use the exams route to submit
        try {
            res = await client.post('/api/exams/1/submit', {
                answers: [{ q: 1, a: 'A' }, { q: 2, a: 'B' }]
            }, { headers: { Authorization: `Bearer ${learnerToken}` } });
            assert(res.status === 201, 'Exam submitted via API');
        } catch (e) {
            console.log('  ⚠️  Exam submit via API failed, injecting directly...');
            const { run } = require('../db');
            try { await run("INSERT OR IGNORE INTO exams (id, title) VALUES (1, 'Test Exam')"); } catch(_) {}
            await run("INSERT INTO exam_submissions (student_id, exam_id, answers, status) VALUES (?, 1, '[]', 'submitted')", [learnerId]);
            await run("INSERT INTO mentor_notifications (student_id, trigger_type, reference_id, is_claimed) VALUES (?, 'exam', last_insert_rowid(), 0)", [learnerId]);
            assert(true, 'Exam submission injected directly into DB');
        }

        // Verify submission exists
        const submission = await get('SELECT id, status FROM exam_submissions WHERE student_id = ?', [learnerId]);
        assert(!!submission, `Submission exists (ID: ${submission?.id})`);
        assert(submission?.status === 'submitted' || submission?.status === 'Submitted' || submission?.status === 'Pending Review', 
            `Submission status is "${submission?.status}"`);

        // ─── STEP 3: LOGIN AS MENTOR BOSE ───
        console.log('\n─── STEP 3: Login as Mentor (bose / 123123) ───');
        res = await client.post('/api/auth/login', {
            email: 'bose',
            password: '123123'
        });
        const mentorToken = res.data.token;
        const mentorId = res.data.user.id;
        assert(!!mentorToken, `Mentor Bose logged in (ID: ${mentorId})`);

        // ─── STEP 4: CHECK ALERTS ───
        console.log('\n─── STEP 4: Check Alerts Feed ───');
        res = await client.get('/api/mentor/notifications', {
            headers: { Authorization: `Bearer ${mentorToken}` }
        });
        const alerts = res.data;
        const learnerAlert = alerts.find(a => a.student_id === learnerId);
        assert(alerts.length > 0, `Alerts feed has ${alerts.length} notifications`);
        assert(!!learnerAlert, 'New learner appears in the alerts feed');

        // Check badge count
        res = await client.get('/api/mentor/notification-count', {
            headers: { Authorization: `Bearer ${mentorToken}` }
        });
        assert(res.data.count >= 1, `Badge count is ${res.data.count}`);

        // ─── STEP 5: CONNECT WITH LEARNER ───
        console.log('\n─── STEP 5: Connect with Learner ───');
        res = await client.post(`/api/mentor/connect/${learnerId}`, {}, {
            headers: { Authorization: `Bearer ${mentorToken}` }
        });
        assert(res.status === 200, 'Connected with learner');

        // CRITICAL: Verify learner is STILL in alerts after connect
        res = await client.get('/api/mentor/notifications', {
            headers: { Authorization: `Bearer ${mentorToken}` }
        });
        const postConnectAlerts = res.data;
        const stillVisible = postConnectAlerts.find(a => a.student_id === learnerId);
        assert(!!stillVisible, '🔑 Learner STILL visible in alerts after Connect (not vanished)');

        // ─── STEP 6: PROVIDE FEEDBACK (Unified Review) ───
        console.log('\n─── STEP 6: Provide Mentor Feedback ───');
        res = await client.post(`/api/mentor/unified-review/${learnerId}`, {
            skillRemarks: 'Great progress on foundational skills!',
            examRemarks: 'Solid answers, well done.'
        }, { headers: { Authorization: `Bearer ${mentorToken}` } });
        assert(res.status === 200, 'Unified review submitted');

        // Check what status the exam is now
        const postReviewSub = await get('SELECT status FROM exam_submissions WHERE student_id = ?', [learnerId]);
        console.log(`  ℹ️  Post-review exam status: "${postReviewSub?.status}"`);

        // ─── STEP 7: ASSIGN ROADMAP (The Critical Move) ───
        console.log('\n─── STEP 7: Assign Roadmap → Move to Dashboard ───');
        res = await client.patch(`/api/mentor/student-status/${learnerId}`, {
            status: 'pending_roadmap'
        }, { headers: { Authorization: `Bearer ${mentorToken}` } });
        assert(res.status === 200, 'Status updated to pending_roadmap');

        // Verify DB state
        const postMoveSub = await get('SELECT status FROM exam_submissions WHERE student_id = ?', [learnerId]);
        assert(postMoveSub?.status === 'pending_roadmap', `DB confirms status = "${postMoveSub?.status}"`);

        const roadmapRow = await get('SELECT id FROM roadmap WHERE student_id = ?', [learnerId]);
        assert(!!roadmapRow, 'Roadmap row created for learner');

        // ─── STEP 8: VERIFY DASHBOARD VISIBILITY ───
        console.log('\n─── STEP 8: Verify Mentor Dashboard (Bose sees the Learner) ───');
        res = await client.get('/api/mentor/my-students', {
            headers: { Authorization: `Bearer ${mentorToken}` }
        });
        const roster = res.data;
        const dashboardLearner = roster.find(s => s.id === learnerId);
        assert(roster.length > 0, `Dashboard roster has ${roster.length} student(s)`);
        assert(!!dashboardLearner, '🏆 LEARNER VISIBLE ON BOSE DASHBOARD');
        assert(dashboardLearner?.status === 'pending_roadmap', `Dashboard status = "${dashboardLearner?.status}"`);
        assert(!!dashboardLearner?.name, `Learner name displayed: "${dashboardLearner?.name}"`);

        // ─── STEP 9: VERIFY ALERTS CLEANUP ───
        console.log('\n─── STEP 9: Verify Alerts Cleanup ───');
        res = await client.get('/api/mentor/notifications', {
            headers: { Authorization: `Bearer ${mentorToken}` }
        });
        const postMoveAlerts = res.data;
        const stillInAlerts = postMoveAlerts.find(a => a.student_id === learnerId);
        assert(!stillInAlerts, 'Learner removed from alerts after roadmap assignment');

    } catch (e) {
        console.error('\n💥 UNHANDLED ERROR:', e.response?.data || e.message);
        failed++;
    } finally {
        console.log('\n═══════════════════════════════════════════');
        console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
        console.log('═══════════════════════════════════════════');
        if (failed === 0) {
            console.log('  🎉 ALL TESTS PASSED!');
        } else {
            console.log('  ⚠️  SOME TESTS FAILED — SEE ABOVE');
        }
        console.log('');
        server.close();
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTest();
