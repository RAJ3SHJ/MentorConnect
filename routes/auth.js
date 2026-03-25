const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get, runGetId } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register — learners self-register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Name, email and password required' });

    try {
        const existing = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing) return res.status(409).json({ error: 'Email already registered' });

        const hash = bcrypt.hashSync(password, 10);
        const id = await runGetId(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email.toLowerCase(), hash, 'learner']
        );
        const token = jwt.sign({ id, name, email, role: 'learner' }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id, name, email, role: 'learner' } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/auth/login — works for both learners and mentors
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password required' });

    try {
        const user = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (!user || !bcrypt.compareSync(password, user.password_hash))
            return res.status(401).json({ error: 'Invalid email or password' });

        const role = user.role || 'learner';
        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role },
            JWT_SECRET, { expiresIn: '7d' }
        );
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/auth/quantum-login — authenticate Admin or Mentor using PIN
router.post('/quantum-login', (req, res) => {
    const { pin, role } = req.body;
    if (!pin || !role) {
        return res.status(400).json({ error: 'PIN and requested role required' });
    }

    const expectedPin = role === 'admin' ? '1230' : '1234';
    if (pin !== expectedPin) {
        return res.status(401).json({ error: 'Invalid Secure PIN' });
    }

    if (role !== 'admin' && role !== 'mentor') {
        return res.status(400).json({ error: 'Invalid role requested' });
    }

    const token = jwt.sign(
        { id: role === 'admin' ? 0 : 999, name: role === 'admin' ? 'Rajesh J.' : 'Primary Mentor', email: `${role}@mentorpath.com`, role: role },
        JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ token, user: { id: role === 'admin' ? 0 : 999, name: role === 'admin' ? 'Rajesh J.' : 'Primary Mentor', email: `${role}@mentorpath.com`, role: role } });
});

// GET /api/auth/profile
const auth = require('../middleware/auth');
router.get('/profile', auth.default || auth, async (req, res) => {
    try {
        const user = await get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.role = user.role || 'learner';
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/auth/profile
router.put('/profile', auth.default || auth, async (req, res) => {
    const { name, email, currentPassword, newPassword } = req.body;
    try {
        const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (newPassword) {
            if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password_hash))
                return res.status(401).json({ error: 'Current password is incorrect' });
            const hash = bcrypt.hashSync(newPassword, 10);
            await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
        }

        if (name) await run('UPDATE users SET name = ? WHERE id = ?', [name, user.id]);
        if (email) {
            const existing = await get('SELECT id FROM users WHERE email = ? AND id != ?', [email.toLowerCase(), user.id]);
            if (existing) return res.status(409).json({ error: 'Email already taken' });
            await run('UPDATE users SET email = ? WHERE id = ?', [email.toLowerCase(), user.id]);
        }

        const updated = await get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [user.id]);
        res.json({ message: 'Profile updated', user: updated });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
