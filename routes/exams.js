const router = require('express').Router();
const { supabaseAdmin, run, get, all, runGetId } = require('../db');
const auth = require('../middleware/auth');

// GET /api/exams — fetch all cloud exams with local submission status
router.get('/', auth, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Identity provider not ready');
        const studentId = req.user.id;

        // Fetch exams from Supabase (admin-created, globally visible)
        const { data: exams, error } = await supabaseAdmin
            .from('exams')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;

        // Fetch submission status from local SQLite (no type conflicts)
        const submissions = await all(
            'SELECT id, status, submitted_at, exam_id FROM exam_submissions WHERE student_id = ?',
            [studentId]
        );

        const result = exams.map(exam => {
            const sub = submissions?.find(s => String(s.exam_id) === String(exam.id));
            return { ...exam, submission: sub || null };
        });

        res.json(result);
    } catch (e) {
        console.error('Fetch Exams Error:', e.message);
        res.status(500).json({ error: 'Failed to load assessments' });
    }
});

// GET /api/exams/:id — fetch exam details and questions from Supabase
router.get('/:id', auth, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Identity provider not ready');

        const { data: exam, error: examErr } = await supabaseAdmin
            .from('exams')
            .select('*')
            .eq('id', req.params.id)
            .single();
        if (examErr) throw examErr;

        const { data: questions, error: qErr } = await supabaseAdmin
            .from('questions')
            .select('*')
            .eq('exam_id', exam.id);
        if (qErr) throw qErr;

        res.json({ ...exam, questions });
    } catch (e) {
        console.error('Fetch Exam Details Error:', e.message);
        res.status(500).json({ error: 'Failed to load exam content' });
    }
});

// POST /api/exams/:id/submit — save submission to local SQLite (with JIT Exam Provisioning)
router.post('/:id/submit', auth, async (req, res) => {
    const { answers } = req.body;
    const examId = req.params.id;

    try {
        // 1. Ensure the exam exists in local DB metadata (Foreign Key requirement)
        const localExam = await get('SELECT id FROM exams WHERE id = ?', [examId]);
        if (!localExam) {
            console.log(`📥 Syncing exam metadata for ID: ${examId}`);
            if (!supabaseAdmin) throw new Error('Identity provider not ready for syncing');
            const { data: cloudExam, error: cloudErr } = await supabaseAdmin
                .from('exams')
                .select('*')
                .eq('id', examId)
                .single();
            
            if (!cloudErr && cloudExam) {
                await run('INSERT INTO exams (id, title, created_at) VALUES (?, ?, ?)', 
                    [cloudExam.id, cloudExam.title, cloudExam.created_at]);
            }
        }

        const submissionId = await runGetId(
            'INSERT INTO exam_submissions (student_id, exam_id, answers) VALUES (?, ?, ?)',
            [req.user.id, examId, JSON.stringify(answers || [])]
        );

        // Also notify mentor via local notifications table
        try {
            await run(
                'INSERT INTO mentor_notifications (student_id, trigger_type, reference_id) VALUES (?, ?, ?)',
                [req.user.id, 'exam', submissionId]
            );
        } catch (_) { /* non-critical */ }

        res.status(201).json({ 
            message: 'Assessment submitted for review 🎉', 
            submissionId 
        });
    } catch (e) {
        console.error('Exam Submission Error:', e.message);
        res.status(500).json({ error: 'Failed to submit your assessment' });
    }
});

module.exports = router;

