const router = require('express').Router();
const { run, get, all, runGetId } = require('../db');
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

module.exports = router;
