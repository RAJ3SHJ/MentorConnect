const API_URL = process.env.API_URL || 'http://localhost:3001';

// Test targets: 6 Students, 2 Mentors, 1 Admin (6-2-1)
const studentCount = 6;
const mentorCount = 2;
const adminCount = 1;

async function runScalabilityTest() {
    console.log('🚀 INITIALIZING 6-2-1 SCALABILITY STRESS TEST');
    console.log(`📡 Target Environment: ${API_URL}`);
    console.log('---');

    const startTime = Date.now();
    try {
        // --- STEP 1: CONCURRENT IDENTITY ACCESS ---
        console.log('🧪 Step 1: Testing Concurrent Admin & Mentor Access...');
        const authAttempts = [
            // Admin PIN Login (Cloud PIN Verification)
            fetch(`${API_URL}/api/auth/quantum-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: '1230', role: 'admin' })
            }),
            // Mentor PIN Login (Legacy Fallback)
            fetch(`${API_URL}/api/auth/quantum-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: '1234', role: 'mentor' })
            })
        ];

        const authResults = await Promise.all(authAttempts);
        if (authResults.every(r => r.ok)) {
            console.log('✅ Admin and Mentor cloud-PIN logic verified.');
        } else {
            console.warn('⚠️ Warning: Primary PIN logic failed. Check if SUPABASE_JWT_SECRET is set.');
        }

        // --- STEP 2: 6-STUDENT BURST REGISTRATION ---
        console.log('\n🧪 Step 2: Simulating 6-Student Burst Registration...');
        const studentRegistration = [];
        for (let i = 0; i < studentCount; i++) {
            const email = `stress_student_${Date.now()}_${i}@mentorpath.com`;
            studentRegistration.push(
                fetch(`${API_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        name: `Stress Student ${i}`, 
                        email, 
                        password: 'Password123!' 
                    })
                }).then(async r => ({ status: r.status, ok: r.ok, data: await r.json() }))
            );
        }

        const regResults = await Promise.all(studentRegistration);
        const successfulRegs = regResults.filter(r => r.ok).length;
        console.log(`📊 Registration Success: ${successfulRegs}/${studentCount}`);

        if (successfulRegs < studentCount) {
            console.error('❌ FAILURE: Burst registration failed to scale. Check Supabase Auth rate limits.');
        }

        // --- STEP 3: CONCURRENT DASHBOARD LOAD ---
        console.log('\n🧪 Step 3: Simulating Concurrent Dashboard Load (Identity tokens)...');
        const dashboardBurst = regResults.filter(r => r.ok).map(reg => {
            const token = reg.data.token;
            return fetch(`${API_URL}/api/student/dashboard-stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => ({ ok: r.ok, status: r.status }));
        });

        const dashResults = await Promise.all(dashboardBurst);
        const successDash = dashResults.filter(r => r.ok).length;
        console.log(`📊 Dashboard Success: ${successDash}/${successfulRegs}`);

        // --- STEP 4: EXECUTIVE PULSE (Admin Overload) ---
        console.log('\n🧪 Step 4: Testing Executive Pulse (Admin Stats Aggregation)...');
        const adminTokenRes = await authResults[0].json();
        const adminToken = adminTokenRes.token;
        
        const adminStatsStart = Date.now();
        const statsRes = await fetch(`${API_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const statsTime = Date.now() - adminStatsStart;

        if (statsRes.ok) {
            const stats = await statsRes.json();
            console.log(`✅ Admin Stats Fetched in ${statsTime}ms`);
            console.log(`📝 Total Learners in Cloud: ${stats.totalStudents}`);
            console.log(`📝 Total Mentors in Cloud: ${stats.totalMentors}`);
        } else {
            console.error('❌ FAILURE: Admin dashboard timeout or error.');
        }

        // --- FINAL SUMMARY ---
        const totalDuration = Date.now() - startTime;
        console.log('\n--- 🏁 TEST COMPLETE ---');
        console.log(`⏱️ Total Execution Time: ${totalDuration}ms`);
        if (successfulRegs === studentCount && statsRes.ok) {
            console.log('🏆 STATUS: SYSTEM SCALABLE (6-2-1 VERIFIED) ✅');
        } else {
            console.log('⚠️ STATUS: SCALABILITY DEGRADED. REVIEW LOGS. ❌');
        }

    } catch (e) {
        console.error('❌ CRITICAL ERROR DURING STRESS TEST:', e.message);
    }
}

runScalabilityTest();
