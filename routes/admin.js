const router = require('express').Router();
const { run, get, all, runGetId } = require('../db');
const auth = require('../middleware/auth');

// ─── MENTORS ───

// GET /api/admin/mentors — list all mentors
router.get('/mentors', auth, (req, res) => {
    const mentors = all('SELECT * FROM mentors ORDER BY created_at DESC');
    // Attach student count for each mentor
    const result = mentors.map(m => {
        const countRow = get('SELECT COUNT(*) as count FROM mentor_assignments WHERE mentor_id = ?', [m.id]);
        return { ...m, student_count: countRow ? countRow.count : 0 };
    });
    res.json(result);
});

// POST /api/admin/mentors — add a new mentor
router.post('/mentors', auth, (req, res) => {
    const { name, email, expertise } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    const id = runGetId(
        'INSERT INTO mentors (name, email, expertise) VALUES (?, ?, ?)',
        [name, email, expertise || null]
    );
    res.status(201).json({ message: 'Mentor added', id });
});

// PUT /api/admin/mentors/:id — update a mentor
router.put('/mentors/:id', auth, (req, res) => {
    const { name, email, expertise } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    const existing = get('SELECT id FROM mentors WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Mentor not found' });

    run('UPDATE mentors SET name = ?, email = ?, expertise = ? WHERE id = ?',
        [name, email, expertise || null, req.params.id]);
    res.json({ message: 'Mentor updated' });
});

// DELETE /api/admin/mentors/:id — delete a mentor
router.delete('/mentors/:id', auth, (req, res) => {
    const existing = get('SELECT id FROM mentors WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Mentor not found' });

    // Remove assignments first
    run('DELETE FROM mentor_assignments WHERE mentor_id = ?', [req.params.id]);
    run('DELETE FROM mentors WHERE id = ?', [req.params.id]);
    res.json({ message: 'Mentor deleted' });
});

// ─── COURSES ───

// GET /api/admin/courses — list all courses
router.get('/courses', auth, (req, res) => {
    res.json(all('SELECT * FROM courses ORDER BY created_at DESC'));
});

// POST /api/admin/courses — add a new course
router.post('/courses', auth, (req, res) => {
    const { title, description, link, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const id = runGetId(
        'INSERT INTO courses (title, description, link, category) VALUES (?, ?, ?, ?)',
        [title, description || null, link || null, category || null]
    );
    res.status(201).json({ message: 'Course added', id });
});

// PUT /api/admin/courses/:id — update a course
router.put('/courses/:id', auth, (req, res) => {
    const { title, description, link, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    run('UPDATE courses SET title = ?, description = ?, link = ?, category = ? WHERE id = ?',
        [title, description || null, link || null, category || null, req.params.id]);
    res.json({ message: 'Course updated' });
});

// DELETE /api/admin/courses/:id — delete a course
router.delete('/courses/:id', auth, (req, res) => {
    run('DELETE FROM roadmap WHERE course_id = ?', [req.params.id]);
    run('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Course deleted' });
});

// ─── EXAMS ───

// GET /api/admin/exams — list all exams with question count
router.get('/exams', auth, (req, res) => {
    const exams = all('SELECT * FROM exams ORDER BY created_at DESC');
    const result = exams.map(e => {
        const qCount = get('SELECT COUNT(*) as count FROM questions WHERE exam_id = ?', [e.id]);
        const subCount = get('SELECT COUNT(*) as count FROM exam_submissions WHERE exam_id = ?', [e.id]);
        return { ...e, question_count: qCount ? qCount.count : 0, submission_count: subCount ? subCount.count : 0 };
    });
    res.json(result);
});

// GET /api/admin/exams/:id — get exam with questions for editing
router.get('/exams/:id', auth, (req, res) => {
    const exam = get('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    const questions = all('SELECT * FROM questions WHERE exam_id = ?', [exam.id]);
    res.json({ ...exam, questions });
});

// POST /api/admin/exams — add exam with questions
router.post('/exams', auth, (req, res) => {
    const { title, questions } = req.body;
    if (!title) return res.status(400).json({ error: 'Exam title required' });
    if (!Array.isArray(questions) || questions.length === 0)
        return res.status(400).json({ error: 'At least one question required' });

    const examId = runGetId('INSERT INTO exams (title) VALUES (?)', [title]);

    for (const q of questions) {
        runGetId(
            'INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d) VALUES (?, ?, ?, ?, ?, ?)',
            [examId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d]
        );
    }

    res.status(201).json({ message: 'Exam created', examId });
});

// PUT /api/admin/exams/:id — update exam title and questions
router.put('/exams/:id', auth, (req, res) => {
    const { title, questions } = req.body;
    if (!title) return res.status(400).json({ error: 'Exam title required' });

    const existing = get('SELECT id FROM exams WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Exam not found' });

    run('UPDATE exams SET title = ? WHERE id = ?', [title, req.params.id]);

    // Replace all questions
    if (Array.isArray(questions)) {
        run('DELETE FROM questions WHERE exam_id = ?', [req.params.id]);
        for (const q of questions) {
            runGetId(
                'INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d) VALUES (?, ?, ?, ?, ?, ?)',
                [req.params.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d]
            );
        }
    }

    res.json({ message: 'Exam updated' });
});

// DELETE /api/admin/exams/:id — delete an exam
router.delete('/exams/:id', auth, (req, res) => {
    run('DELETE FROM questions WHERE exam_id = ?', [req.params.id]);
    run('DELETE FROM exam_submissions WHERE exam_id = ?', [req.params.id]);
    run('DELETE FROM exams WHERE id = ?', [req.params.id]);
    res.json({ message: 'Exam deleted' });
});

// ─── DASHBOARD STATS ───

// GET /api/admin/stats — overall platform stats
router.get('/stats', auth, (req, res) => {
    const totalStudents = get('SELECT COUNT(*) as c FROM users');
    const totalMentors = get('SELECT COUNT(*) as c FROM mentors');
    const totalCourses = get('SELECT COUNT(*) as c FROM courses');
    const totalExams = get('SELECT COUNT(*) as c FROM exams');
    const totalSubmissions = get('SELECT COUNT(*) as c FROM exam_submissions');
    const pendingReviews = get("SELECT COUNT(*) as c FROM exam_submissions WHERE status = 'Pending Review'");
    const approved = get("SELECT COUNT(*) as c FROM exam_submissions WHERE status = 'Approved'");
    const needsImprovement = get("SELECT COUNT(*) as c FROM exam_submissions WHERE status = 'Needs Improvement'");
    const assignedStudents = get('SELECT COUNT(DISTINCT student_id) as c FROM mentor_assignments');
    const roadmapComplete = get("SELECT COUNT(*) as c FROM roadmap WHERE status = 'Complete'");
    const roadmapInProgress = get("SELECT COUNT(*) as c FROM roadmap WHERE status = 'In Progress'");
    const roadmapYetToStart = get("SELECT COUNT(*) as c FROM roadmap WHERE status = 'Yet to Start'");
    const skillAssessments = get('SELECT COUNT(*) as c FROM student_skills');

    res.json({
        totalStudents: totalStudents?.c || 0,
        totalMentors: totalMentors?.c || 0,
        totalCourses: totalCourses?.c || 0,
        totalExams: totalExams?.c || 0,
        totalSubmissions: totalSubmissions?.c || 0,
        pendingReviews: pendingReviews?.c || 0,
        approved: approved?.c || 0,
        needsImprovement: needsImprovement?.c || 0,
        assignedStudents: assignedStudents?.c || 0,
        roadmapComplete: roadmapComplete?.c || 0,
        roadmapInProgress: roadmapInProgress?.c || 0,
        roadmapYetToStart: roadmapYetToStart?.c || 0,
        skillAssessments: skillAssessments?.c || 0,
    });
});

// ─── BULK UPLOAD ───

// POST /api/admin/courses/bulk — bulk add courses from Excel
router.post('/courses/bulk', auth, (req, res) => {
    const { courses } = req.body;
    if (!Array.isArray(courses) || courses.length === 0)
        return res.status(400).json({ error: 'courses array required' });

    let added = 0;
    for (const c of courses) {
        if (!c.title) continue;
        runGetId('INSERT INTO courses (title, description, link, category) VALUES (?, ?, ?, ?)',
            [c.title, c.description || null, c.link || null, c.category || null]);
        added++;
    }

    res.status(201).json({ message: `${added} course(s) added`, added });
});

// POST /api/admin/exams/bulk — bulk add exams with questions from Excel
router.post('/exams/bulk', auth, (req, res) => {
    const { exams } = req.body;
    if (!Array.isArray(exams) || exams.length === 0)
        return res.status(400).json({ error: 'exams array required' });

    let added = 0;
    for (const exam of exams) {
        if (!exam.title || !Array.isArray(exam.questions) || exam.questions.length === 0) continue;
        const examId = runGetId('INSERT INTO exams (title) VALUES (?)', [exam.title]);
        for (const q of exam.questions) {
            if (!q.question_text) continue;
            runGetId(
                'INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d) VALUES (?, ?, ?, ?, ?, ?)',
                [examId, q.question_text, q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || '']
            );
        }
        added++;
    }

    res.status(201).json({ message: `${added} exam(s) added`, added });
});

// ─── MENTOR ACCOUNTS ───
const bcrypt = require('bcryptjs');

// POST /api/admin/create-mentor — create a mentor user account
router.post('/create-mentor', auth, (req, res) => {
    const { name, email, password, expertise } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Name, email and password required' });

    try {
        const existing = get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing) return res.status(409).json({ error: 'Email already registered' });

        const hash = bcrypt.hashSync(password, 10);
        const userId = runGetId(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email.toLowerCase(), hash, 'mentor']
        );

        // Also add to mentors table for backwards compatibility
        runGetId(
            'INSERT INTO mentors (name, email, expertise) VALUES (?, ?, ?)',
            [name, email.toLowerCase(), expertise || null]
        );

        res.status(201).json({ message: 'Mentor account created', id: userId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/mentor-accounts — list all mentor users
router.get('/mentor-accounts', auth, (req, res) => {
    const mentors = all("SELECT id, name, email, created_at FROM users WHERE role = 'mentor' ORDER BY created_at DESC");
    const result = mentors.map(m => {
        const learners = all(`
            SELECT u.id, u.name, u.email FROM mentor_assignments ma
            JOIN users u ON u.id = ma.student_id
            WHERE ma.mentor_id = ?
        `, [m.id]);
        return { ...m, learners, learner_count: learners.length };
    });
    res.json(result);
});

// GET /api/admin/mentor-assignments — all mentor→learner mappings
router.get('/mentor-assignments', auth, (req, res) => {
    const assignments = all(`
        SELECT ma.id, ma.assigned_at,
               m.name AS mentor_name, m.email AS mentor_email, m.id AS mentor_id,
               u.name AS learner_name, u.email AS learner_email, u.id AS learner_id
        FROM mentor_assignments ma
        JOIN mentors m ON m.id = ma.mentor_id
        JOIN users u ON u.id = ma.student_id
        ORDER BY ma.assigned_at DESC
    `);
    res.json(assignments);
});

module.exports = router;
