const router = require('express').Router();
const { run, all } = require('../db');
const auth = require('../middleware/auth');

// GET /api/notifications
router.get('/', auth, (req, res) => {
  const rows = all(`
    SELECT n.id, n.type, n.student_id, n.reference_id, n.is_read, n.created_at,
           u.name AS student_name, u.email AS student_email
    FROM notifications n
    JOIN users u ON u.id = n.student_id
    ORDER BY n.created_at DESC
  `);
  res.json(rows);
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth, (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Marked as read' });
});

// GET /api/notifications/unread-count
const { get } = require('../db');
router.get('/unread-count', auth, (req, res) => {
  const row = get('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');
  res.json({ count: row ? row.count : 0 });
});

module.exports = router;
