const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get, runGetId, supabaseAdmin } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register — learners self-register in Supabase Auth
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Name, email and password required' });

    if (!supabaseAdmin) return res.status(500).json({ error: 'Identity provider not ready' });

    try {
        // 1. Create User in Supabase Auth
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            password: password,
            email_confirm: true,
            user_metadata: { name, role: 'learner' }
        });

        if (error) throw error;

        // 2. Generate initial login token (Supabase will handle real sessions on log in)
        // For the registration response, we can just return success or follow up with login
        res.status(201).json({ 
            message: 'Registration successful! Proceed to login 🎉', 
            user: { id: data.user.id, name, email: email.toLowerCase(), role: 'learner' } 
        });
    } catch (e) {
        console.error('Registration Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/auth/login — centralized entry for legacy users (Students are moving to Supabase)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password required' });

    try {
        // NOTE: Leaners are encouraged to use direct Supabase login on frontend like Mentors do.
        // This endpoint remains as a fallback or for specific administrative login needs.
        const user = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (!user || (user.password_hash && !bcrypt.compareSync(password, user.password_hash)))
            return res.status(401).json({ error: 'Invalid email or password' });

        const role = user.role || 'learner';
        const token = jwt.sign(
            { id: user.id || user.email, name: user.name, email: user.email, role },
            LEGACY_JWT_SECRET, { expiresIn: '7d' }
        );
        res.json({ token, user: { id: user.id || user.email, name: user.name, email: user.email, role } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



// POST /api/auth/quantum-login — authenticate Admin or Mentor using PIN
router.post('/quantum-login', async (req, res) => {
    const { pin, role } = req.body;
    if (!pin || !role) {
        return res.status(400).json({ error: 'PIN and requested role required' });
    }

    try {
        if (role === 'admin') {
            // Check the PIN against the Supabase system_config table
            if (!supabaseAdmin) throw new Error('Supabase Admin not initialized');
            const { data, error } = await supabaseAdmin
                .from('system_config')
                .select('value')
                .eq('key', 'admin_pin')
                .single();

            if (error || !data || pin !== data.value) {
                return res.status(401).json({ error: 'Invalid Administrative PIN' });
            }

            const token = jwt.sign(
                { id: 0, name: 'Main Admin', email: 'admin@mentorpath.com', role: 'admin' },
                JWT_SECRET, { expiresIn: '7d' }
            );
            return res.json({ token, user: { id: 0, name: 'Main Admin', email: 'admin@mentorpath.com', role: 'admin' } });
        }

        // Shared/Legacy Mentor PIN path (to be scrapped soon)
        const expectedPin = '1234';
        if (pin !== expectedPin) {
            return res.status(401).json({ error: 'Invalid Secure PIN' });
        }

        const token = jwt.sign(
            { id: 999, name: 'Primary Mentor', email: `mentor@mentorpath.com`, role: 'mentor' },
            JWT_SECRET, { expiresIn: '7d' }
        );
        res.json({ token, user: { id: 999, name: 'Primary Mentor', email: `mentor@mentorpath.com`, role: 'mentor' } });
    } catch (e) {
        console.error('Quantum Login Error:', e.message);
        res.status(500).json({ error: e.message });
    }
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
