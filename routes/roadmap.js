const router = require('express').Router();
const { run, get, all } = require('../db');
const auth = require('../middleware/auth');

// GET /api/roadmap
router.get('/', auth, (req, res) => {
    const rows = all(`
    SELECT r.id, r.status, r.assigned_at, c.title, c.description, c.link, c.category
    FROM roadmap r
    JOIN courses c ON c.id = r.course_id
    WHERE r.student_id = ?
    ORDER BY r.assigned_at DESC
  `, [req.user.id]);
    res.json(rows);
});

// PATCH /api/roadmap/:id
router.patch('/:id', auth, (req, res) => {
    const { status } = req.body;
    const allowed = ['Yet to Start', 'In Progress', 'Complete'];
    if (!allowed.includes(status))
        return res.status(400).json({ error: 'Invalid status value' });

    const row = get('SELECT * FROM roadmap WHERE id = ? AND student_id = ?', [req.params.id, req.user.id]);
    if (!row) return res.status(404).json({ error: 'Roadmap entry not found' });

    run('UPDATE roadmap SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Status updated' });
});

module.exports = router;
