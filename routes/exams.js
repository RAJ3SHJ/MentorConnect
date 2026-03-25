const router = require('express').Router();
const { run, get, all, runGetId } = require('../db');
const auth = require('../middleware/auth');

// GET /api/exams
router.get('/', auth, async (req, res) => {
    try {
        const exams = await all('SELECT * FROM exams ORDER BY created_at DESC');
        const result = await Promise.all(exams.map(async exam => {
            const sub = await get(
                'SELECT id, status, submitted_at FROM exam_submissions WHERE student_id = ? AND exam_id = ?',
                [req.user.id, exam.id]
            );
            return { ...exam, submission: sub || null };
        }));
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/exams/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const exam = await get('SELECT * FROM exams WHERE id = ?', [req.params.id]);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });
        const questions = await all('SELECT * FROM questions WHERE exam_id = ?', [exam.id]);
        res.json({ ...exam, questions });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/exams/:id/submit
router.post('/:id/submit', auth, async (req, res) => {
    const { answers } = req.body;
    try {
        const exam = await get('SELECT * FROM exams WHERE id = ?', [req.params.id]);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        const answersJson = JSON.stringify(answers || []);
        const submissionId = await runGetId(
            'INSERT INTO exam_submissions (student_id, exam_id, answers) VALUES (?, ?, ?)',
            [req.user.id, exam.id, answersJson]
        );

        // Phase 6: broadcast a single mentor_notification for all mentors to see
        await runGetId(
            'INSERT INTO mentor_notifications (student_id, trigger_type, reference_id) VALUES (?, ?, ?)',
            [req.user.id, 'exam', submissionId]
        );

        // Legacy notification record
        await runGetId(
            'INSERT INTO notifications (type, student_id, reference_id) VALUES (?, ?, ?)',
            ['exam_submitted', req.user.id, submissionId]
        );

        res.status(201).json({ message: 'Exam submitted for review', submissionId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
