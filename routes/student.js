const router = require('express').Router();
const { run, get, all, runGetId, supabaseAdmin } = require('../db');
const auth = require('../middleware/auth');

// GET /api/student/profile — fetch Supabase cloud profile
router.get('/profile', auth, async (req, res) => {
  try {
    // req.user.id is the Supabase UUID from the verified JWT
    const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
    if (error) throw error;
    
    res.json({
        id: user.user.id,
        name: user.user.user_metadata?.name || 'Learner',
        email: user.user.email,
        created_at: user.user.created_at
    });
  } catch (e) {
    console.error('Fetch Student Profile Error:', e.message);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// GET /api/student/dashboard-stats — pull stats from Supabase cloud tables
router.get('/dashboard-stats', auth, async (req, res) => {
  const studentId = req.user.id;
  try {
    if (!supabaseAdmin) throw new Error('Supabase Admin not initialized');

    const [
        { data: roadmap },
        { data: submissions },
        { data: skills },
        { data: mentorAssignment }
    ] = await Promise.all([
      supabaseAdmin.from('roadmap').select('status, courses(category)').eq('student_id', studentId),
      supabaseAdmin.from('exam_submissions').select('status, submitted_at, exams(title)').eq('student_id', studentId),
      supabaseAdmin.from('student_skills').select('*').eq('student_id', studentId).single(),
      supabaseAdmin.from('mentor_assignments').select('mentors(name, expertise)').eq('student_id', studentId).single()
    ]);

    // Roadmap calculations
    const total = roadmap?.length || 0;
    const complete = roadmap?.filter(r => r.status === 'Complete').length || 0;
    const inProgress = roadmap?.filter(r => r.status === 'In Progress').length || 0;
    const yetToStart = roadmap?.filter(r => r.status === 'Yet to Start').length || 0;

    // Exam stats
    const examsPending = submissions?.filter(s => s.status === 'Pending Review').length || 0;
    const examsApproved = submissions?.filter(s => s.status === 'Approved').length || 0;
    const examsNeedsWork = submissions?.filter(s => s.status === 'Needs Improvement').length || 0;

    res.json({
      roadmap: { total, complete, inProgress, yetToStart },
      exams: { total: submissions?.length || 0, pending: examsPending, approved: examsApproved, needsImprovement: examsNeedsWork },
      hasSkills: !!skills,
      mentor: mentorAssignment?.mentors || null,
      progressPct: total > 0 ? Math.round((complete / total) * 100) : 0,
      weeklyActivity: [] // Optional: feature to be built on Postgres later
    });
  } catch (e) {
    console.error('Student Dashboard Stats Error:', e.message);
    res.status(500).json({ error: 'Failed to load your analytics' });
  }
});

// GET /api/student/skills — fetch goals and skillset from local DB
router.get('/skills', auth, async (req, res) => {
    try {
        const row = await get('SELECT * FROM student_skills WHERE student_id = ?', [req.user.id]);
        if (!row) return res.json(null); // Return null so frontend knows it's unsubmitted
        // Parse skills if stored as JSON string
        const skills = typeof row.skills === 'string' ? JSON.parse(row.skills) : (row.skills || []);
        res.json({ ...row, skills });
    } catch (e) {
        console.error('Fetch Skills Error:', e.message);
        res.status(500).json({ error: 'Failed to retrieve assessment data' });
    }
});

// POST /api/student/skills — save/update skillset in local DB
router.post('/skills', auth, async (req, res) => {
    const { goal, skills } = req.body;
    try {
        const skillsJson = JSON.stringify(skills || []);
        
        // Execute the insertion correctly based on database type
        const existing = await get('SELECT id FROM student_skills WHERE student_id = ?', [req.user.id]);
        let referenceId;
        
        if (existing) {
            await run(
                'UPDATE student_skills SET goal = ?, skills = ?, status = \'Pending Review\', submitted_at = CURRENT_TIMESTAMP WHERE student_id = ?',
                [goal, skillsJson, req.user.id]
            );
            referenceId = existing.id;
        } else {
            referenceId = await runGetId(
                'INSERT INTO student_skills (student_id, goal, skills) VALUES (?, ?, ?)',
                [req.user.id, goal, skillsJson]
            );
        }

        // Notify mentor correctly for both cases (re-trigger notification)
        await run(
            'INSERT INTO mentor_notifications (student_id, trigger_type, reference_id, is_claimed) VALUES (?, ?, ?, 0)',
            [req.user.id, 'skills', referenceId]
        ).catch(() => {});

        res.status(201).json({ message: 'Skill assessment updated! 🎯' });
    } catch (e) {
        console.error('Update Skills Error:', e.message);
        res.status(500).json({ error: 'Failed to save assessment' });
    }
});

module.exports = router;
