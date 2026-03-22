const router = require('express').Router();
const { run, get, all, runGetId } = require('../db');
const auth = require('../middleware/auth');

// GET /api/exams
router.get('/', auth, (req, res) => {
    const exams = all('SELECT * FROM exams ORDER BY created_at DESC');
    const result = exams.map(exam => {
        const sub = get(
            'SELECT id, status, submitted_at FROM exam_submissions WHERE student_id = ? AND exam_id = ?',
            [req.user.id, exam.id]
        );
        return { ...exam, submission: sub || null };
    });
    res.json(result);
});

// GET /api/exams/:id
router.get('/:id', auth, (req, res) => {
    const exam = get('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    const questions = all('SELECT * FROM questions WHERE exam_id = ?', [exam.id]);
    res.json({ ...exam, questions });
});

// POST /api/exams/:id/submit
router.post('/:id/submit', auth, (req, res) => {
    const { answers } = req.body;
    const exam = get('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const answersJson = JSON.stringify(answers || []);
    const submissionId = runGetId(
        'INSERT INTO exam_submissions (student_id, exam_id, answers) VALUES (?, ?, ?)',
        [req.user.id, exam.id, answersJson]
    );

    runGetId(
        'INSERT INTO notifications (type, student_id, reference_id) VALUES (?, ?, ?)',
        ['exam_submitted', req.user.id, submissionId]
    );

    res.status(201).json({ message: 'Exam submitted for review', submissionId });
});

module.exports = router;
