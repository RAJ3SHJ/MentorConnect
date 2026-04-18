const https = require('https');

const API_BASE = 'https://mentor-app-backend-w6bk.onrender.com/api';

function request(path, method, body, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + path);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log('🚀 Starting Bulk Learner Creation...');

    // 1. Get Mentor Token
    const mentorLogin = await request('/auth/quantum-login', 'POST', { pin: '1234', role: 'mentor' });
    if (mentorLogin.status !== 200) throw new Error('Mentor login failed: ' + JSON.stringify(mentorLogin.data));
    const mentorToken = mentorLogin.data.token;
    console.log('✅ Mentor Authenticated');

    const examId = 2;
    const courseIds = [1, 2, 3];

    for (let i = 1; i <= 10; i++) {
        const id = Math.random().toString(36).substring(7);
        const name = `Bulk Learner ${i} (${id})`;
        const email = `bulk_${id}@test.com`;
        const password = 'Password123!';

        console.log(`\n👤 Creating Learner ${i}: ${name}`);

        // Register
        const reg = await request('/auth/register', 'POST', { name, email, password });
        if (reg.status !== 201) {
            console.error(`❌ Registration failed for ${name}:`, reg.data);
            continue;
        }

        // Login
        const login = await request('/auth/login', 'POST', { email, password });
        if (login.status !== 200) {
            console.error(`❌ Login failed for ${name}:`, login.data);
            continue;
        }
        const learnerToken = login.data.token;
        const studentId = login.data.user.id;

        // Submit Skills
        console.log(`  📝 Submitting skills...`);
        await request('/student/skills', 'POST', {
            goal: `Become a Senior Developer by learning ${id}`,
            skills: ['React', 'Node.js', 'System Design', 'Cloud Architecture']
        }, learnerToken);

        // Submit Exam
        console.log(`  ✍️ Submitting exam...`);
        await request(`/exams/${examId}/submit`, 'POST', {
            answers: [
                { questionId: 1, answer: 'This is my detailed answer for question 1.' },
                { questionId: 2, answer: 'Optimization is key to scalability.' }
            ]
        }, learnerToken);

        // Connect (First 5 users)
        if (i <= 5) {
            console.log(`  🔗 Connecting to mentor...`);
            await request(`/mentor/connect/${studentId}`, 'POST', {}, mentorToken);

            // Assign Roadmap
            console.log(`  🗺️ Assigning roadmap...`);
            await request('/mentor/assign-course', 'POST', {
                student_id: studentId,
                course_ids: courseIds
            }, mentorToken);
        } else {
            console.log(`  🔔 Leaving in Alerts (Unconnected)`);
        }

        console.log(`✅ Finished Learner ${i}`);
        
        // Brief delay to avoid hitting rate limits too hard
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n✨ ALL DONE! 10 learners created and populated.');
}

run().catch(console.error);
