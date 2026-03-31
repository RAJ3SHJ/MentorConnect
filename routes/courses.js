const router = require('express').Router();
const { supabaseAdmin } = require('../db');
const auth = require('../middleware/auth');

// GET /api/courses — fetch all cloud courses
router.get('/', auth, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Identity provider not ready');
        
        const { data: courses, error } = await supabaseAdmin
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(courses);
    } catch (e) {
        console.error('Fetch Courses Error:', e.message);
        res.status(500).json({ error: 'Failed to retrieve course catalog' });
    }
});

module.exports = router;
