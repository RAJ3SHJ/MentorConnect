const router = require('express').Router();
const { all } = require('../db');
const auth = require('../middleware/auth');

// GET /api/courses
router.get('/', auth, (req, res) => {
    const courses = all('SELECT * FROM courses ORDER BY created_at DESC');
    res.json(courses);
});

module.exports = router;
