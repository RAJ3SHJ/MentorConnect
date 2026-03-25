const router = require('express').Router();
const { all } = require('../db');
const auth = require('../middleware/auth');

// GET /api/courses
router.get('/', auth, async (req, res) => {
    try {
        const courses = await all('SELECT * FROM courses ORDER BY created_at DESC');
        res.json(courses);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
