// End-to-End API Test Suite for MentorPath
// Run with: node e2e_test.js

const http = require('http');

const BASE = 'http://localhost:3001';
let passCount = 0;
let failCount = 0;
const results = [];

function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE);
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        };
        const req = http.request(opts, (res) => {
            let chunks = '';
            res.on('data', (c) => (chunks += c));
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(chunks) });
                } catch {
                    resolve({ status: res.statusCode, data: chunks });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

function test(name, passed, detail) {
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`);
    results.push({ name, passed, detail });
    if (passed) passCount++;
    else failCount++;
}

async function run() {
    const ts = Date.now();
    const email = `e2e_${ts}@test.com`;
    const mentorEmail = `mentor_${ts}@test.com`;

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║         MentorPath E2E Test Suite                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // ═══════════════════════════════════════════
    console.log('━━━ TEST 1: Learner Registration ━━━');
    const reg = await request('POST', '/api/auth/register', {
        name: 'E2E Learner', email, password: 'test1234',
    });
    test('Registration returns 201', reg.status === 201, `status=${reg.status}`);
    test('Returns token', !!reg.data.token, reg.data.token ? 'token present' : 'no token');
    test('Returns user object', !!reg.data.user, JSON.stringify(reg.data.user));
    test('User role is learner', reg.data.user?.role === 'learner', `role=${reg.data.user?.role}`);
    const learnerToken = reg.data.token;

    // Duplicate registration
    const dup = await request('POST', '/api/auth/register', {
        name: 'Dup', email, password: 'test1234',
    });
    test('Duplicate email returns 409', dup.status === 409, `status=${dup.status}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 2: Learner Login ━━━');
    const login = await request('POST', '/api/auth/login', { email, password: 'test1234' });
    test('Login returns 200', login.status === 200, `status=${login.status}`);
    test('Login returns token', !!login.data.token, '');
    test('Login user has role=learner', login.data.user?.role === 'learner', `role=${login.data.user?.role}`);

    const wrongPw = await request('POST', '/api/auth/login', { email, password: 'wrong' });
    test('Wrong password returns 401', wrongPw.status === 401, `status=${wrongPw.status}`);

    const noUser = await request('POST', '/api/auth/login', { email: 'nobody@x.com', password: '1234' });
    test('Non-existent user returns 401', noUser.status === 401, `status=${noUser.status}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 3: Profile ━━━');
    const profile = await request('GET', '/api/auth/profile', null, learnerToken);
    test('Profile returns 200', profile.status === 200, `status=${profile.status}`);
    test('Profile has name', profile.data.name === 'E2E Learner', `name=${profile.data.name}`);
    test('Profile has role', profile.data.role === 'learner', `role=${profile.data.role}`);

    const noAuth = await request('GET', '/api/auth/profile');
    test('Profile without token returns 401', noAuth.status === 401, `status=${noAuth.status}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 4: Skills Assessment ━━━');
    const skills = await request('POST', '/api/student/skills', {
        goal: 'Become a data analyst', skills: ['SQL', 'Python', 'Tableau'],
    }, learnerToken);
    test('Skills submission works', skills.status === 200 || skills.status === 201, `status=${skills.status}`);

    const getSkills = await request('GET', '/api/student/skills', null, learnerToken);
    test('Get skills returns data', getSkills.status === 200, `status=${getSkills.status}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 5: Courses ━━━');
    const courses = await request('GET', '/api/courses', null, learnerToken);
    test('Get courses returns 200', courses.status === 200, `count=${Array.isArray(courses.data) ? courses.data.length : '?'}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 6: Exams ━━━');
    const exams = await request('GET', '/api/exams', null, learnerToken);
    test('Get exams returns 200', exams.status === 200, `count=${Array.isArray(exams.data) ? exams.data.length : '?'}`);

    // Try to submit an exam if any exist
    if (Array.isArray(exams.data) && exams.data.length > 0) {
        const examId = exams.data[0].id;
        const examDetail = await request('GET', `/api/exams/${examId}`, null, learnerToken);
        test('Get exam detail returns 200', examDetail.status === 200, `questions=${examDetail.data?.questions?.length || 0}`);

        if (examDetail.data?.questions?.length > 0) {
            const answers = examDetail.data.questions.map(q => ({
                question_id: q.id, selected: 'a',
            }));
            const submit = await request('POST', `/api/exams/${examId}/submit`, { answers }, learnerToken);
            test('Submit exam works', submit.status === 200 || submit.status === 201, `status=${submit.status}`);
        }
    }

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 7: Roadmap ━━━');
    const roadmap = await request('GET', '/api/roadmap', null, learnerToken);
    test('Get roadmap returns 200', roadmap.status === 200, `count=${Array.isArray(roadmap.data) ? roadmap.data.length : '?'}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 8: Dashboard Stats ━━━');
    const stats = await request('GET', '/api/student/dashboard-stats', null, learnerToken);
    test('Dashboard stats returns 200', stats.status === 200, `status=${stats.status}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 9: Admin - Create Mentor Account ━━━');
    const createMentor = await request('POST', '/api/admin/create-mentor', {
        name: 'E2E Mentor', email: mentorEmail, password: 'mentor123', expertise: 'Testing',
    }, learnerToken);
    test('Create mentor returns 201', createMentor.status === 201, `status=${createMentor.status}, msg=${createMentor.data?.message}`);

    // Duplicate mentor
    const dupMentor = await request('POST', '/api/admin/create-mentor', {
        name: 'Dup Mentor', email: mentorEmail, password: 'x', expertise: 'X',
    }, learnerToken);
    test('Duplicate mentor email returns 409', dupMentor.status === 409, `status=${dupMentor.status}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 10: Mentor Login ━━━');
    const mentorLogin = await request('POST', '/api/auth/login', {
        email: mentorEmail, password: 'mentor123',
    });
    test('Mentor login returns 200', mentorLogin.status === 200, `status=${mentorLogin.status}`);
    test('Mentor role is "mentor"', mentorLogin.data.user?.role === 'mentor', `role=${mentorLogin.data.user?.role}`);
    const mentorToken = mentorLogin.data.token;

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 11: Mentor Profile ━━━');
    const mentorProfile = await request('GET', '/api/auth/profile', null, mentorToken);
    test('Mentor profile returns 200', mentorProfile.status === 200, `status=${mentorProfile.status}`);
    test('Mentor profile has role=mentor', mentorProfile.data.role === 'mentor', `role=${mentorProfile.data.role}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 12: Admin Endpoints ━━━');
    const adminStats = await request('GET', '/api/admin/stats', null, learnerToken);
    test('Admin stats returns 200', adminStats.status === 200, `learners=${adminStats.data?.totalStudents}`);

    const mentorAccounts = await request('GET', '/api/admin/mentor-accounts', null, learnerToken);
    test('Mentor accounts returns 200', mentorAccounts.status === 200, `count=${Array.isArray(mentorAccounts.data) ? mentorAccounts.data.length : '?'}`);

    const mentorAssignments = await request('GET', '/api/admin/mentor-assignments', null, learnerToken);
    test('Mentor assignments returns 200', mentorAssignments.status === 200, `count=${Array.isArray(mentorAssignments.data) ? mentorAssignments.data.length : '?'}`);

    const adminMentors = await request('GET', '/api/admin/mentors', null, learnerToken);
    test('Admin mentors list returns 200', adminMentors.status === 200, `count=${Array.isArray(adminMentors.data) ? adminMentors.data.length : '?'}`);

    const adminCourses = await request('GET', '/api/admin/courses', null, learnerToken);
    test('Admin courses list returns 200', adminCourses.status === 200, `count=${Array.isArray(adminCourses.data) ? adminCourses.data.length : '?'}`);

    const adminExams = await request('GET', '/api/admin/exams', null, learnerToken);
    test('Admin exams list returns 200', adminExams.status === 200, `count=${Array.isArray(adminExams.data) ? adminExams.data.length : '?'}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 13: Mentor Features ━━━');
    const mentorStudents = await request('GET', '/api/mentor/students', null, mentorToken);
    test('Mentor get students returns 200', mentorStudents.status === 200, `count=${Array.isArray(mentorStudents.data) ? mentorStudents.data.length : '?'}`);

    const mentorList = await request('GET', '/api/mentor/list', null, mentorToken);
    test('Mentor list returns 200', mentorList.status === 200, `count=${Array.isArray(mentorList.data) ? mentorList.data.length : '?'}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 14: Notifications ━━━');
    const notifs = await request('GET', '/api/notifications/unread-count', null, learnerToken);
    test('Unread count returns 200', notifs.status === 200, `count=${notifs.data?.count}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 15: Profile Update ━━━');
    const update = await request('PUT', '/api/auth/profile', {
        name: 'E2E Learner Updated',
    }, learnerToken);
    test('Profile update returns 200', update.status === 200, `name=${update.data?.user?.name}`);

    // Verify update
    const updated = await request('GET', '/api/auth/profile', null, learnerToken);
    test('Updated name persisted', updated.data.name === 'E2E Learner Updated', `name=${updated.data.name}`);

    // ═══════════════════════════════════════════
    console.log('\n━━━ TEST 16: Validation (empty/bad requests) ━━━');
    const noName = await request('POST', '/api/auth/register', { email: 'x@x.com', password: '1234' });
    test('Register without name returns 400', noName.status === 400, `status=${noName.status}`);

    const noEmail = await request('POST', '/api/auth/login', { password: '1234' });
    test('Login without email returns 400', noEmail.status === 400, `status=${noEmail.status}`);

    // ═══════════════════════════════════════════
    // SUMMARY
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log(`║  RESULTS: ${passCount} passed, ${failCount} failed, ${passCount + failCount} total       ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');

    if (failCount > 0) {
        console.log('\n❌ FAILED TESTS:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   • ${r.name} — ${r.detail}`);
        });
    } else {
        console.log('\n🎉 ALL TESTS PASSED!\n');
    }
}

run().catch(e => console.error('Test runner error:', e));
