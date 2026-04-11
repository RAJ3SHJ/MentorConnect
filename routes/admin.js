const router = require('express').Router();
const { run, get, all, runGetId, supabaseAdmin } = require('../db');
const auth = require('../middleware/auth');

// ─── STUDENTS ───

// GET /api/admin/students — list all learners
router.get('/students', auth, async (req, res) => {
    try {
        const students = await all(`
            SELECT id, name, first_name, last_name, qualification, username, email, created_at 
            FROM users 
            WHERE role = 'learner' 
            ORDER BY created_at DESC
        `);
        res.json(students);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/students/:id — update a learner profile
router.post('/students/:id', auth, async (req, res) => {
    // Note: I'm using POST for update if I want to be safe, but let's use PUT as planned
});

router.put('/students/:id', auth, async (req, res) => {
    const { firstName, lastName, qualification, username, password } = req.body;
    try {
        const existing = await get('SELECT id, email FROM users WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Student not found' });

        const name = `${firstName} ${lastName}`.trim();
        const internalEmail = username ? `${username.toLowerCase()}@mentor.local` : existing.email;
        const bcrypt = require('bcryptjs');

        // 1. Sync with Supabase Auth if needed
        if (supabaseAdmin) {
            const updateObj = {};
            if (password) updateObj.password = password;
            if (username) updateObj.email = internalEmail;
            
            if (Object.keys(updateObj).length > 0) {
                const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, updateObj);
                if (authError) throw authError;
            }
        }

        // 2. Update local DB
        if (password) {
            const hash = bcrypt.hashSync(password, 10);
            await run(`
                UPDATE users 
                SET name = ?, first_name = ?, last_name = ?, qualification = ?, username = ?, email = ?, password_hash = ? 
                WHERE id = ?
            `, [name, firstName, lastName, qualification, username, internalEmail, hash, req.params.id]);
        } else {
            await run(`
                UPDATE users 
                SET name = ?, first_name = ?, last_name = ?, qualification = ?, username = ?, email = ? 
                WHERE id = ?
            `, [name, firstName, lastName, qualification, username, internalEmail, req.params.id]);
        }

        res.json({ message: 'Student profile synchronized and updated ✅' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/students/:id — delete a student and their data
router.delete('/students/:id', auth, async (req, res) => {
    try {
        const existing = await get('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Student not found' });

        // 1. Purge from Supabase Auth to free up username/email
        if (supabaseAdmin) {
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
            if (authError && authError.status !== 404) {
               console.error('Supabase Delete Error:', authError);
            }
        }

        // 2. Clean up local data
        await run('DELETE FROM roadmap WHERE student_id = ?', [req.params.id]);
        await run('DELETE FROM mentor_assignments WHERE student_id = ?', [req.params.id]);
        await run('DELETE FROM student_skills WHERE student_id = ?', [req.params.id]);
        await run('DELETE FROM exam_submissions WHERE student_id = ?', [req.params.id]);
        await run('DELETE FROM notifications WHERE student_id = ?', [req.params.id]);
        await run('DELETE FROM users WHERE id = ?', [req.params.id]);
        
        res.json({ message: 'Student and identity purged successfully 🗑️' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/hard-reset-development
router.post('/hard-reset-development', auth, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Supabase Admin not initialized');
        
        // 1. Wipe all Auth Users
        const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
        if (!error && users?.users?.length > 0) {
            for (const user of users.users) {
                await supabaseAdmin.auth.admin.deleteUser(user.id);
            }
        }
        
        // 2. Wipe public Postgres DB
        const pg = require('../db').getDb(); // get the underlying pool
        const tables = [
            'mentor_assignments', 'roadmap', 'student_skills', 
            'exam_submissions', 'notifications', 'mentor_notifications',
            'questions', 'exams', 'courses', 'users', 'mentors'
        ];
        
        for (const table of tables) {
            await run(`DROP TABLE IF EXISTS ${table} CASCADE`);
        }
        
        // 3. Recreate the schema perfectly
        const { initDb } = require('../db');
        await initDb();

        res.json({ message: 'Hard DB Reset Complete! Database is perfectly clean.' });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

// ─── MENTORS ───

// GET /api/admin/mentors — list all mentors from Supabase
router.get('/mentors', auth, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Supabase Admin not initialized');

        // Fetch all mentors from the public.mentors table
        const { data: mentors, error } = await supabaseAdmin
            .from('mentors')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Attach student count for each mentor by checking assignments
        const result = await Promise.all(mentors.map(async m => {
            const { count, error: countError } = await supabaseAdmin
                .from('mentor_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('mentor_id', m.id);
            
            return { ...m, student_count: count || 0 };
        }));

        res.json(result);
    } catch (e) {
        console.error('Admin Fetch Mentors Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/mentors — add a new mentor
router.post('/mentors', auth, async (req, res) => {
    const { name, email, expertise } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    try {
        const id = await runGetId(
            'INSERT INTO mentors (name, email, expertise) VALUES (?, ?, ?)',
            [name, email, expertise || null]
        );
        res.status(201).json({ message: 'Mentor added', id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/mentors/:id — update a mentor
router.put('/mentors/:id', auth, async (req, res) => {
    const { firstName, lastName, qualification, username, password, expertise } = req.body;
    try {
        const existing = await get('SELECT id, email FROM users WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Mentor not found' });

        const name = `${firstName} ${lastName}`.trim();
        const internalEmail = username ? `${username.toLowerCase()}@mentor.local` : existing.email;
        const bcrypt = require('bcryptjs');

        // 1. Sync with Supabase Auth
        if (supabaseAdmin) {
            const updateObj = {};
            if (password) updateObj.password = password;
            if (username) updateObj.email = internalEmail;
            
            if (Object.keys(updateObj).length > 0) {
                const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, updateObj);
                if (authError) throw authError;
            }
        }

        // 2. Sync with Supabase 'mentors' table
        const { error: profileError } = await supabaseAdmin
            .from('mentors')
            .update({
                name,
                email: internalEmail,
                expertise: expertise || null
            })
            .eq('id', req.params.id);

        if (profileError) throw profileError;

        // 3. Update local users table
        if (password) {
            const hash = bcrypt.hashSync(password, 10);
            await run(`
                UPDATE users 
                SET name = ?, first_name = ?, last_name = ?, qualification = ?, username = ?, email = ?, password_hash = ? 
                WHERE id = ?
            `, [name, firstName, lastName, qualification, username, internalEmail, hash, req.params.id]);
        } else {
            await run(`
                UPDATE users 
                SET name = ?, first_name = ?, last_name = ?, qualification = ?, username = ?, email = ? 
                WHERE id = ?
            `, [name, firstName, lastName, qualification, username, internalEmail, req.params.id]);
        }

        res.json({ message: 'Mentor profile synchronized and updated ✅' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/mentors/:id — delete a mentor
router.delete('/mentors/:id', auth, async (req, res) => {
    try {
        const existing = await get('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Mentor not found' });

        // 1. Purge from Supabase Auth
        if (supabaseAdmin) {
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
            if (authError && authError.status !== 404) {
               console.error('Supabase Mentor Delete Error:', authError);
            }
        }

        // 2. Remove assignments first
        await run('DELETE FROM mentor_assignments WHERE mentor_id = ?', [req.params.id]);
        
        // 3. Remove profile from public.mentors
        const { error: profileError } = await supabaseAdmin.from('mentors').delete().eq('id', req.params.id);
        if (profileError) console.error('Supabase Profile Delete Error:', profileError);

        // 4. Purge from local users
        await run('DELETE FROM users WHERE id = ?', [req.params.id]);

        res.json({ message: 'Mentor and identity purged successfully 🗑️' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── COURSES ───

// GET /api/admin/courses — list all courses
router.get('/courses', auth, async (req, res) => {
    try {
        const courses = await all('SELECT * FROM courses ORDER BY created_at DESC');
        res.json(courses);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/courses — add a new course
router.post('/courses', auth, async (req, res) => {
    const { title, description, link, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    try {
        const id = await runGetId(
            'INSERT INTO courses (title, description, link, category) VALUES (?, ?, ?, ?)',
            [title, description || null, link || null, category || null]
        );
        res.status(201).json({ message: 'Course added', id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/courses/:id — update a course
router.put('/courses/:id', auth, async (req, res) => {
    const { title, description, link, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    try {
        await run('UPDATE courses SET title = ?, description = ?, link = ?, category = ? WHERE id = ?',
            [title, description || null, link || null, category || null, req.params.id]);
        res.json({ message: 'Course updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/courses/:id — delete a course
router.delete('/courses/:id', auth, async (req, res) => {
    try {
        await run('DELETE FROM roadmap WHERE course_id = ?', [req.params.id]);
        await run('DELETE FROM courses WHERE id = ?', [req.params.id]);
        res.json({ message: 'Course deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── EXAMS ───

// GET /api/admin/exams — list all exams with question count
router.get('/exams', auth, async (req, res) => {
    try {
        const exams = await all('SELECT * FROM exams ORDER BY created_at DESC');
        const result = await Promise.all(exams.map(async e => {
            const qCount = await get('SELECT COUNT(*) as count FROM questions WHERE exam_id = ?', [e.id]);
            const subCount = await get('SELECT COUNT(*) as count FROM exam_submissions WHERE exam_id = ?', [e.id]);
            return { ...e, question_count: qCount ? qCount.count : 0, submission_count: subCount ? subCount.count : 0 };
        }));
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/exams/:id — get exam with questions for editing
router.get('/exams/:id', auth, async (req, res) => {
    try {
        const exam = await get('SELECT * FROM exams WHERE id = ?', [req.params.id]);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });
        const questions = await all('SELECT * FROM questions WHERE exam_id = ?', [exam.id]);
        res.json({ ...exam, questions });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/exams — add exam with questions
router.post('/exams', auth, async (req, res) => {
    const { title, questions } = req.body;
    if (!title) return res.status(400).json({ error: 'Exam title required' });
    if (!Array.isArray(questions) || questions.length === 0)
        return res.status(400).json({ error: 'At least one question required' });

    try {
        const examId = await runGetId('INSERT INTO exams (title) VALUES (?)', [title]);

        for (const q of questions) {
            await runGetId(
                'INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d) VALUES (?, ?, ?, ?, ?, ?)',
                [examId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d]
            );
        }

        res.status(201).json({ message: 'Exam created', examId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/exams/:id — update exam title and questions
router.put('/exams/:id', auth, async (req, res) => {
    const { title, questions } = req.body;
    if (!title) return res.status(400).json({ error: 'Exam title required' });

    try {
        const existing = await get('SELECT id FROM exams WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Exam not found' });

        await run('UPDATE exams SET title = ? WHERE id = ?', [title, req.params.id]);

        // Replace all questions
        if (Array.isArray(questions)) {
            await run('DELETE FROM questions WHERE exam_id = ?', [req.params.id]);
            for (const q of questions) {
                await runGetId(
                    'INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d) VALUES (?, ?, ?, ?, ?, ?)',
                    [req.params.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d]
                );
            }
        }

        res.json({ message: 'Exam updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/exams/:id — delete an exam
router.delete('/exams/:id', auth, async (req, res) => {
    try {
        await run('DELETE FROM questions WHERE exam_id = ?', [req.params.id]);
        await run('DELETE FROM exam_submissions WHERE exam_id = ?', [req.params.id]);
        await run('DELETE FROM exams WHERE id = ?', [req.params.id]);
        res.json({ message: 'Exam deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── DASHBOARD STATS ───

// GET /api/admin/stats — overall platform stats from Supabase
router.get('/stats', auth, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Supabase Admin not initialized');

        // Fetch counts from various tables in parallel
        const [
            { count: totalStudents },
            { count: totalMentors },
            { count: totalCourses },
            { count: totalExams },
            { count: totalSubmissions },
            { count: pendingReviews }
        ] = await Promise.all([
            // In a full migration, students would be in a public profiles table linked to auth.users
            // For now we count learners from the users table
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'learner'),
            supabaseAdmin.from('mentors').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('courses').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('exams').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('exam_submissions').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('exam_submissions').select('*', { count: 'exact', head: true }).eq('status', 'Pending Review')
        ]);

        res.json({
            totalStudents: totalStudents || 0,
            totalMentors: totalMentors || 0,
            totalCourses: totalCourses || 0,
            totalExams: totalExams || 0,
            totalSubmissions: totalSubmissions || 0,
            pendingReviews: pendingReviews || 0,
            // Add placeholder constants for charts to keep UI stable during migration
            approved: 0,
            needsImprovement: 0,
            assignedStudents: 0,
            roadmapComplete: 0,
            roadmapInProgress: 0,
            roadmapYetToStart: 0,
            skillAssessments: 0,
        });
    } catch (e) {
        console.error('Admin Fetch Stats Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─── BULK UPLOAD ───

// POST /api/admin/courses/bulk — bulk add courses from Excel
router.post('/courses/bulk', auth, async (req, res) => {
    const { courses } = req.body;
    if (!Array.isArray(courses) || courses.length === 0)
        return res.status(400).json({ error: 'courses array required' });

    try {
        let added = 0;
        const uploadData = [];
        for (const c of courses) {
            if (!c.title) continue;
            uploadData.push({
                title: c.title,
                description: c.description || null,
                link: c.link || null,
                category: c.category || null
            });
            // Still keep local for dashboard stats if needed
            await run('INSERT OR REPLACE INTO courses (title, description, link, category) VALUES (?, ?, ?, ?)',
                [c.title, c.description || null, c.link || null, c.category || null]);
            added++;
        }

        if (supabaseAdmin && uploadData.length > 0) {
            const { error } = await supabaseAdmin.from('courses').upsert(uploadData, { onConflict: 'title' });
            if (error) console.error('Supabase Course Sync Error:', error.message);
        }

        res.status(201).json({ message: `${added} course(s) synchronized! 🌐`, added });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/exams/bulk — bulk add exams with questions from Excel
router.post('/exams/bulk', auth, async (req, res) => {
    const { exams } = req.body;
    if (!Array.isArray(exams) || exams.length === 0)
        return res.status(400).json({ error: 'exams array required' });

    try {
        let added = 0;
        if (!supabaseAdmin) throw new Error('Cloud Identity Provider not initialized');

        for (const exam of exams) {
            if (!exam.title || !Array.isArray(exam.questions) || exam.questions.length === 0) continue;
            
            // 1. Create the exam in Supabase
            const { data: cloudExam, error: examErr } = await supabaseAdmin
                .from('exams')
                .insert({ title: exam.title })
                .select()
                .single();
            
            if (examErr) {
                console.error(`Error creating exam "${exam.title}":`, examErr.message);
                continue;
            }

            // 2. Add questions in bulk to Supabase
            const questionData = exam.questions.map(q => ({
                exam_id: cloudExam.id,
                question_text: q.question_text,
                option_a: q.option_a || '',
                option_b: q.option_b || '',
                option_c: q.option_c || '',
                option_d: q.option_d || ''
            }));

            const { error: qErr } = await supabaseAdmin.from('questions').insert(questionData);
            if (qErr) console.error(`Error adding questions for "${exam.title}":`, qErr.message);

            // 3. Keep local DB in sync for backward compatibility
            const examId = await runGetId('INSERT INTO exams (title) VALUES (?)', [exam.title]);
            for (const q of exam.questions) {
                if (!q.question_text) continue;
                await run('INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d) VALUES (?, ?, ?, ?, ?, ?)',
                    [examId, q.question_text, q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || '']);
            }
            added++;
        }

        res.status(201).json({ message: `${added} exam(s) provisioned globally! 🏆`, added });
    } catch (e) { 
        console.error('Bulk Exam Upload Error:', e.message);
        res.status(500).json({ error: e.message }); 
    }
});

// ─── MENTOR ACCOUNTS ───


// POST /api/admin/create-mentor — create a mentor user account using Supabase Auth Admin
router.post('/create-mentor', auth, async (req, res) => {
    const { firstName, lastName, qualification, username, password, expertise } = req.body;
    if (!firstName || !username || !password)
        return res.status(400).json({ error: 'First Name, Username and Password required' });

    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase Admin is not initialized' });
    }

    try {
        const name = `${firstName} ${lastName}`.trim();
        const internalEmail = `${username.toLowerCase()}@mentor.local`;
        const bcrypt = require('bcryptjs');
        const hash = bcrypt.hashSync(password, 10);

        // 1. Create the user in Supabase Auth
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: internalEmail,
            password: password,
            email_confirm: true,
            user_metadata: { name, role: 'mentor', username }
        });

        if (error) {
            if (error.status === 422 || error.message.includes('already registered')) {
                return res.status(409).json({ error: `Username "${username}" is already taken. Please choose another.` });
            }
            throw error;
        }

        // 2. Sync with Supabase 'mentors' table (Profile)
        // Note: We only send columns that typically exist in the default schema to avoid errors.
        // Detailed fields are stored in our local DB for the dashboard.
        const { error: profileError } = await supabaseAdmin
            .from('mentors')
            .upsert([{
                id: data.user.id,
                name: name,
                email: internalEmail,
                expertise: expertise || null
                // first_name, last_name, qualification, username omitted here to avoid Supabase schema cache errors
            }]);

        if (profileError) throw profileError;

        // 3. Sync with local users table
        await run(
            `INSERT INTO users (id, name, first_name, last_name, qualification, username, email, password_hash, role) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.user.id, name, firstName, lastName, qualification, username, internalEmail, hash, 'mentor']
        );

        res.status(201).json({ 
            message: `Mentor account provisioned for ${firstName}! 🎉`, 
            id: data.user.id 
        });
    } catch (e) {
        console.error('Mentor Provisioning Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/create-student — create a learner account using Supabase Auth Admin
router.post('/create-student', auth, async (req, res) => {
    const { firstName, lastName, qualification, username, password } = req.body;
    if (!firstName || !username || !password)
        return res.status(400).json({ error: 'First Name, Username and Password required' });

    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase Admin is not initialized' });
    }

    try {
        const name = `${firstName} ${lastName}`.trim();
        const internalEmail = `${username.toLowerCase()}@mentor.local`;
        const bcrypt = require('bcryptjs');
        const hash = bcrypt.hashSync(password, 10);

        // 1. Create the user in Supabase Auth
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: internalEmail,
            password: password,
            email_confirm: true,
            user_metadata: { name, role: 'learner', username }
        });

        if (error) {
            if (error.status === 422 || error.message.includes('already registered')) {
                return res.status(409).json({ error: `Username "${username}" is already taken. Please choose another.` });
            }
            throw error;
        }

        // 2. Sync with local users table
        await run(
            `INSERT INTO users (id, name, first_name, last_name, qualification, username, email, password_hash, role) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.user.id, name, firstName, lastName, qualification, username, internalEmail, hash, 'learner']
        );

        // 3. Notify system of new onboarding
        try {
            await run(
                'INSERT INTO notifications (type, student_id, is_read) VALUES (?, ?, ?)',
                ['NEW_ONBOARDING', data.user.id, 0]
            );
        } catch (nErr) { console.error('Notification log failure:', nErr.message); }

        res.status(201).json({ 
            message: `Learner "${username}" provisioned successfully! 🎉`, 
            id: data.user.id 
        });
    } catch (e) {
        console.error('Learner Provisioning Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/mentor-accounts — list all mentor users
router.get('/mentor-accounts', auth, async (req, res) => {
    try {
        const mentors = await all("SELECT id, name, email, created_at FROM users WHERE role = 'mentor' ORDER BY created_at DESC");
        const result = await Promise.all(mentors.map(async m => {
            const learners = await all(`
                SELECT u.id, u.name, u.email FROM mentor_assignments ma
                JOIN users u ON u.id = ma.student_id
                WHERE ma.mentor_id = ?
            `, [m.id]);
            return { ...m, learners, learner_count: learners.length };
        }));
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/mentor-assignments — all mentor→learner mappings
router.get('/mentor-assignments', auth, async (req, res) => {
    try {
        const assignments = await all(`
            SELECT ma.id, ma.assigned_at,
                   m.name AS mentor_name, m.email AS mentor_email, m.id AS mentor_id,
                   u.name AS learner_name, u.email AS learner_email, u.id AS learner_id
            FROM mentor_assignments ma
            JOIN mentors m ON m.id = ma.mentor_id
            JOIN users u ON u.id = ma.student_id
            ORDER BY ma.assigned_at DESC
        `);
        res.json(assignments);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
