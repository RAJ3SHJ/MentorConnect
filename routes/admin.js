const router = require('express').Router();
const { run, get, all, runGetId, supabaseAdmin } = require('../db');
const auth = require('../middleware/auth');

// ─── STUDENTS ───

// GET /api/admin/students — list all learners
router.get('/students', auth, async (req, res) => {
    try {
        const students = await all("SELECT id, name, email, created_at FROM users WHERE role = 'learner' ORDER BY created_at DESC");
        res.json(students);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/students/:id — delete a student and their data
router.delete('/students/:id', auth, async (req, res) => {
    try {
        const existing = await get('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Student not found' });

        await run('DELETE FROM roadmap WHERE student_id = ?', [req.params.id]);
        await run('DELETE FROM mentor_assignments WHERE student_id = ?', [req.params.id]);
        await run('DELETE FROM student_skills WHERE student_id = ?', [req.params.id]);
        await run('DELETE FROM exam_submissions WHERE student_id = ?', [req.params.id]);
        await run('DELETE FROM notifications WHERE student_id = ?', [req.params.id]);
        await run('DELETE FROM users WHERE id = ?', [req.params.id]);
        
        res.json({ message: 'Student deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
    const { name, email, expertise, password } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    try {
        const existing = await get('SELECT id FROM mentors WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Mentor not found' });

        await run('UPDATE mentors SET name = ?, email = ?, expertise = ? WHERE id = ?',
            [name, email.toLowerCase(), expertise || null, req.params.id]);

        // Update or Insert into users table
        const existingUser = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        const bcrypt = require('bcryptjs');
        if (existingUser) {
            if (password) {
                const hash = bcrypt.hashSync(password, 10);
                await run('UPDATE users SET name = ?, password_hash = ?, role = ? WHERE id = ?', [name, hash, 'mentor', existingUser.id]);
            } else {
                await run('UPDATE users SET name = ?, role = ? WHERE id = ?', [name, 'mentor', existingUser.id]);
            }
        } else if (password) {
            // Hydrate legacy mentor
            const hash = bcrypt.hashSync(password, 10);
            await runGetId(
                'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [name, email.toLowerCase(), hash, 'mentor']
            );
        }
        res.json({ message: 'Mentor updated with credentials sync' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/mentors/:id — delete a mentor
router.delete('/mentors/:id', auth, async (req, res) => {
    try {
        const existing = await get('SELECT id, email FROM mentors WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Mentor not found' });

        // Remove assignments first
        await run('DELETE FROM mentor_assignments WHERE mentor_id = ?', [req.params.id]);
        await run('DELETE FROM mentors WHERE id = ?', [req.params.id]);
        
        // Purge Auth Profile
        if (existing.email) {
            await run('DELETE FROM users WHERE email = ? AND role = ?', [existing.email.toLowerCase(), 'mentor']);
        }

        res.json({ message: 'Mentor deleted' });
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
        for (const c of courses) {
            if (!c.title) continue;
            await run('INSERT INTO courses (title, description, link, category) VALUES (?, ?, ?, ?)',
                [c.title, c.description || null, c.link || null, c.category || null]);
            added++;
        }

        res.status(201).json({ message: `${added} course(s) added`, added });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/exams/bulk — bulk add exams with questions from Excel
router.post('/exams/bulk', auth, async (req, res) => {
    const { exams } = req.body;
    if (!Array.isArray(exams) || exams.length === 0)
        return res.status(400).json({ error: 'exams array required' });

    try {
        let added = 0;
        for (const exam of exams) {
            if (!exam.title || !Array.isArray(exam.questions) || exam.questions.length === 0) continue;
            const examId = await runGetId('INSERT INTO exams (title) VALUES (?)', [exam.title]);
            for (const q of exam.questions) {
                if (!q.question_text) continue;
                await run('INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d) VALUES (?, ?, ?, ?, ?, ?)',
                    [examId, q.question_text, q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || '']);
            }
            added++;
        }

        res.status(201).json({ message: `${added} exam(s) added`, added });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── MENTOR ACCOUNTS ───


// POST /api/admin/create-mentor — create a mentor user account using Supabase Auth Admin
router.post('/create-mentor', auth, async (req, res) => {
    const { name, email, password, expertise } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Name, email and password required' });

    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase Admin is not initialized' });
    }

    try {
        // 1. Create the user in Supabase Auth using the Service Role
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            password: password,
            email_confirm: true,
            user_metadata: { name, role: 'mentor' }
        });

        if (error) throw error;

        // 2. Insert into our public.mentors table with the new UID
        const { error: profileError } = await supabaseAdmin
            .from('mentors')
            .insert([{
                id: data.user.id,
                name: name,
                email: email.toLowerCase(),
                expertise: expertise || null
            }]);

        if (profileError) {
            // Cleanup: delete the auth user if profile creation fails? 
            // For now, we'll just log it.
            console.error('Profile Creation Error:', profileError);
            return res.status(500).json({ error: 'Auth user created but profile failed: ' + profileError.message });
        }

        res.status(201).json({ 
            message: 'Mentor account created successfully 🎉', 
            id: data.user.id 
        });
    } catch (e) {
        console.error('Provisioning Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/create-student — create a learner account using Supabase Auth Admin
router.post('/create-student', auth, async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Name, email and password required' });

    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase Admin is not initialized' });
    }

    try {
        // 1. Create the user in Supabase Auth using the Service Role
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            password: password,
            email_confirm: true,
            user_metadata: { name, role: 'learner' }
        });

        if (error) throw error;

        // 2. Insert into our local users table
        await run(
            'INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)',
            [data.user.id, name, email.toLowerCase(), 'learner']
        );

        res.status(201).json({ 
            message: 'Learner account created successfully 🎉', 
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
