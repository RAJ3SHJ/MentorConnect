const router = require('express').Router();
const { run, get, all, runGetId } = require('../db');
const auth = require('../middleware/auth');

// GET /api/mentor/students
router.get('/students', auth, (req, res) => {
    const students = all(`
    SELECT u.id, u.name, u.email, u.created_at,
           m.id AS mentor_id, m.name AS mentor_name
    FROM users u
    LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
    LEFT JOIN mentors m ON m.id = ma.mentor_id
    ORDER BY u.created_at DESC
  `);
    res.json(students);
});

// POST /api/mentor/link
router.post('/link', auth, (req, res) => {
    const { mentor_id, student_id } = req.body;
    if (!mentor_id || !student_id)
        return res.status(400).json({ error: 'mentor_id and student_id required' });

    try {
        const existing = get('SELECT id FROM mentor_assignments WHERE student_id = ?', [student_id]);
        if (existing) {
            run('UPDATE mentor_assignments SET mentor_id = ?, assigned_at = datetime(\'now\') WHERE student_id = ?',
                [mentor_id, student_id]);
        } else {
            runGetId('INSERT INTO mentor_assignments (mentor_id, student_id) VALUES (?, ?)',
                [mentor_id, student_id]);
        }
        res.json({ message: 'Mentor linked to student' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/mentor/submissions/:studentId
router.get('/submissions/:studentId', auth, (req, res) => {
    const submissions = all(`
    SELECT es.id, es.student_id, es.exam_id, es.answers, es.status,
           es.mentor_remarks, es.submitted_at, es.reviewed_at, e.title AS exam_title
    FROM exam_submissions es
    JOIN exams e ON e.id = es.exam_id
    WHERE es.student_id = ?
    ORDER BY es.submitted_at DESC
  `, [req.params.studentId]);

    const result = submissions.map(sub => ({
        ...sub,
        answers: JSON.parse(sub.answers || '[]'),
    }));
    res.json(result);
});

// GET /api/mentor/student-detail/:studentId
router.get('/student-detail/:studentId', auth, (req, res) => {
    const user = get('SELECT id, name, email FROM users WHERE id = ?', [req.params.studentId]);
    if (!user) return res.status(404).json({ error: 'Student not found' });

    const skills = get('SELECT * FROM student_skills WHERE student_id = ?', [req.params.studentId]);
    const submissions = all(`
    SELECT es.id, es.student_id, es.exam_id, es.answers, es.status,
           es.mentor_remarks, es.submitted_at, es.reviewed_at, e.title AS exam_title
    FROM exam_submissions es
    JOIN exams e ON e.id = es.exam_id
    WHERE es.student_id = ?
    ORDER BY es.submitted_at DESC
  `, [req.params.studentId]);

    res.json({
        student: user,
        skills: skills ? { ...skills, skills: JSON.parse(skills.skills || '[]') } : null,
        submissions: submissions.map(s => ({ ...s, answers: JSON.parse(s.answers || '[]') })),
    });
});

// POST /api/mentor/validate/:submissionId
router.post('/validate/:submissionId', auth, (req, res) => {
    const { status, remarks } = req.body;
    if (!['Approved', 'Needs Improvement'].includes(status))
        return res.status(400).json({ error: 'status must be Approved or Needs Improvement' });

    run(`
    UPDATE exam_submissions
    SET status = ?, mentor_remarks = ?, reviewed_at = datetime('now')
    WHERE id = ?
  `, [status, remarks || null, req.params.submissionId]);

    res.json({ message: 'Validation saved' });
});

// POST /api/mentor/assign-course
router.post('/assign-course', auth, (req, res) => {
    const { student_id, course_ids } = req.body;
    if (!student_id || !Array.isArray(course_ids) || course_ids.length === 0)
        return res.status(400).json({ error: 'student_id and course_ids[] required' });

    for (const cid of course_ids) {
        const existing = get('SELECT id FROM roadmap WHERE student_id = ? AND course_id = ?', [student_id, cid]);
        if (!existing) {
            runGetId('INSERT INTO roadmap (student_id, course_id) VALUES (?, ?)', [student_id, cid]);
        }
    }

    res.json({ message: `${course_ids.length} course(s) assigned` });
});

// GET /api/mentor/list
router.get('/list', auth, (req, res) => {
    const mentors = all('SELECT * FROM mentors ORDER BY name');
    res.json(mentors);
});

// ─── PHASE 2: COMMAND CENTER ROUTES ───

// GET /api/mentor/my-students
router.get('/my-students', auth, (req, res) => {
    // Return all students for skeleton dev key, otherwise strictly filter by assigned mentor_id
    const students = all(`
        SELECT u.id, u.name, u.email, u.created_at, u.mentor_id 
        FROM users u 
        WHERE u.role = 'learner' AND (u.mentor_id = ? OR ? = 999)
        ORDER BY u.created_at DESC
    `, [req.user.id, req.user.id]);
    res.json(students);
});

// GET /api/mentor/my-assessments
router.get('/my-assessments', auth, (req, res) => {
    const submissions = all(`
        SELECT es.id, es.student_id, es.exam_id, es.answers, es.status,
               es.mentor_remarks, es.submitted_at, es.reviewed_at, e.title AS exam_title, u.name AS student_name
        FROM exam_submissions es
        JOIN exams e ON e.id = es.exam_id
        JOIN users u ON u.id = es.student_id
        WHERE es.status IN ('Submitted', 'Pending Review') AND (u.mentor_id = ? OR ? = 999)
        ORDER BY es.submitted_at DESC
    `, [req.user.id, req.user.id]);
    
    const result = submissions.map(sub => ({ ...sub, answers: JSON.parse(sub.answers || '[]') }));
    res.json(result);
});

// POST /api/mentor/courses
router.post('/courses', auth, (req, res) => {
    const { title, description, link, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Course title required' });
    
    try {
        const courseId = runGetId(
            'INSERT INTO courses (title, description, link, category, created_by_role, created_by_id) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description || null, link || null, category || null, req.user.role || 'mentor', req.user.id]
        );
        res.status(201).json({ message: 'Course created by Mentor', courseId });
    } catch (e) {
        res.status(500).json({ error: 'Failed to create course' });
    }
});

module.exports = router;
