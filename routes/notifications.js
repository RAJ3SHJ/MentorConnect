const router = require('express').Router();
const { run, get, all } = require('../db');
const auth = require('../middleware/auth');

// GET /api/notifications
router.get('/', auth, async (req, res) => {
  try {
    const rows = await all(`
      SELECT n.id, n.type, n.student_id, n.reference_id, n.is_read, n.created_at,
             u.name AS student_name, u.email AS student_email
      FROM notifications n
      JOIN users u ON u.id = n.student_id
      ORDER BY n.created_at DESC
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/notifications/unread-count

router.get('/unread-count', auth, async (req, res) => {
  try {
    const row = await get('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');
    res.json({ count: row ? row.count : 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
