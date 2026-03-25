const router = require('express').Router();
const { run, get, all, runGetId } = require('../db');
const auth = require('../middleware/auth');

// GET /api/student/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await get('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/student/skills
router.post('/skills', auth, async (req, res) => {
  const { goal, skills } = req.body;
  if (!goal) return res.status(400).json({ error: 'Goal is required' });

  try {
    const skillsJson = JSON.stringify(skills || []);
    const existing = await get('SELECT id FROM student_skills WHERE student_id = ?', [req.user.id]);

    let skillId;
    if (existing) {
      await run(
        `UPDATE student_skills SET goal = ?, skills = ?, submitted_at = ${isPG ? 'CURRENT_TIMESTAMP' : "datetime('now')"} WHERE student_id = ?`,
        [goal, skillsJson, req.user.id]
      );
      skillId = existing.id;
    } else {
      skillId = await runGetId(
        'INSERT INTO student_skills (student_id, goal, skills) VALUES (?, ?, ?)',
        [req.user.id, goal, skillsJson]
      );
    }

    // Create notification for mentor
    await runGetId(
      'INSERT INTO notifications (type, student_id, reference_id) VALUES (?, ?, ?)',
      ['skill_assessment', req.user.id, skillId]
    );

    const row = await get('SELECT * FROM student_skills WHERE student_id = ?', [req.user.id]);
    res.json({ message: 'Skills saved', data: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/student/skills
router.get('/skills', auth, async (req, res) => {
  try {
    const row = await get('SELECT * FROM student_skills WHERE student_id = ?', [req.user.id]);
    if (!row) return res.json(null);
    res.json({ ...row, skills: JSON.parse(row.skills || '[]') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/student/mentor
router.get('/mentor', auth, async (req, res) => {
  try {
    const assignment = await get(`
      SELECT m.*, ma.assigned_at
      FROM mentor_assignments ma
      JOIN mentors m ON m.id = ma.mentor_id
      WHERE ma.student_id = ?
    `, [req.user.id]);
    res.json(assignment || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/student/dashboard-stats — rich analytics for dashboard
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const [roadmap, submissions, skills, mentor] = await Promise.all([
      all('SELECT r.status, c.category FROM roadmap r JOIN courses c ON c.id = r.course_id WHERE r.student_id = ?', [req.user.id]),
      all("SELECT es.status, es.submitted_at, e.title FROM exam_submissions es JOIN exams e ON e.id = es.exam_id WHERE es.student_id = ?", [req.user.id]),
      get('SELECT * FROM student_skills WHERE student_id = ?', [req.user.id]),
      get('SELECT m.name, m.expertise FROM mentor_assignments ma JOIN mentors m ON m.id = ma.mentor_id WHERE ma.student_id = ?', [req.user.id])
    ]);

    // Roadmap stats
    const total = roadmap.length;
    const complete = roadmap.filter(r => r.status === 'Complete').length;
    const inProgress = roadmap.filter(r => r.status === 'In Progress').length;
    const yetToStart = roadmap.filter(r => r.status === 'Yet to Start').length;

    // Category breakdown
    const categories = {};
    roadmap.forEach(r => {
      const cat = r.category || 'Uncategorized';
      if (!categories[cat]) categories[cat] = { total: 0, complete: 0 };
      categories[cat].total++;
      if (r.status === 'Complete') categories[cat].complete++;
    });

    // Exam stats
    const examsPending = submissions.filter(s => s.status === 'Pending Review').length;
    const examsApproved = submissions.filter(s => s.status === 'Approved').length;
    const examsNeedsWork = submissions.filter(s => s.status === 'Needs Improvement').length;

    // Weekly activity (last 7 days of submissions)
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const count = submissions.filter(s => s.submitted_at && s.submitted_at.startsWith(dayStr)).length;
      weeklyActivity.push({ day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()], count });
    }

    res.json({
      roadmap: { total, complete, inProgress, yetToStart },
      categories,
      exams: { total: submissions.length, pending: examsPending, approved: examsApproved, needsImprovement: examsNeedsWork },
      weeklyActivity,
      hasSkills: !!skills,
      mentor: mentor || null,
      progressPct: total > 0 ? Math.round((complete / total) * 100) : 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
