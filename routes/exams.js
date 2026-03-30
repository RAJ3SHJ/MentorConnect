const { supabaseAdmin } = require('../db');

// GET /api/exams — fetch all cloud exams with student submission status
router.get('/', auth, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Identity provider not ready');
        const studentId = req.user.id;

        const { data: exams, error } = await supabaseAdmin
            .from('exams')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;

        // Fetch submissions for this specific student in parallel
        const { data: submissions } = await supabaseAdmin
            .from('exam_submissions')
            .select('id, status, submitted_at, exam_id')
            .eq('student_id', studentId);

        const result = exams.map(exam => {
            const sub = submissions?.find(s => s.exam_id === exam.id);
            return { ...exam, submission: sub || null };
        });

        res.json(result);
    } catch (e) {
        console.error('Fetch Exams Error:', e.message);
        res.status(500).json({ error: 'Failed to load assessments' });
    }
});

// GET /api/exams/:id — fetch exam details and questions
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

// POST /api/exams/:id/submit — submit assessment results to the cloud
router.post('/:id/submit', auth, async (req, res) => {
    const { answers } = req.body;
    try {
        if (!supabaseAdmin) throw new Error('Identity provider not ready');

        // Create the submission record
        const { data: submission, error } = await supabaseAdmin
            .from('exam_submissions')
            .insert({
                student_id: req.user.id,
                exam_id: req.params.id,
                answers: answers || []
            })
            .select()
            .single();
        if (error) throw error;

        // Notify mentors via the cloud notification system
        await supabaseAdmin.from('mentor_notifications').insert({
            student_id: req.user.id,
            trigger_type: 'exam',
            reference_id: submission.id
        });

        res.status(201).json({ 
            message: 'Assessment submitted for review 🎉', 
            submissionId: submission.id 
        });
    } catch (e) {
        console.error('Exam Submission Error:', e.message);
        res.status(500).json({ error: 'Failed to submit your assessment' });
    }
});

module.exports = router;
