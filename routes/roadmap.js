const router = require('express').Router();
const { run, get, all } = require('../db');
const auth = require('../middleware/auth');

// GET /api/roadmap
router.get('/', auth, async (req, res) => {
    try {
        const rows = await all(`
            SELECT r.id, r.status, r.assigned_at, c.title, c.description, c.link, c.category
            FROM roadmap r
            JOIN courses c ON c.id = r.course_id
            WHERE r.student_id = ?
            ORDER BY r.assigned_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/roadmap/:id
router.patch('/:id', auth, async (req, res) => {
    const { status } = req.body;
    const allowed = ['Yet to Start', 'In Progress', 'Complete'];
    if (!allowed.includes(status))
        return res.status(400).json({ error: 'Invalid status value' });

    try {
        const row = await get('SELECT * FROM roadmap WHERE id = ? AND student_id = ?', [req.params.id, req.user.id]);
        if (!row) return res.status(404).json({ error: 'Roadmap entry not found' });

        await run('UPDATE roadmap SET status = ? WHERE id = ?', [status, req.params.id]);

        // Phase 6: Notify mentors when course is completed
        if (status === 'Complete') {
            await run(
                'INSERT INTO mentor_notifications (student_id, trigger_type, reference_id) VALUES (?, ?, ?)',
                [req.user.id, 'course', row.course_id]
            );
        }

        res.json({ message: 'Status updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
