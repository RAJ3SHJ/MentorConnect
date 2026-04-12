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

// POST /api/auth/login — centralized entry for all users (Cloud-First)
router.post('/login', async (req, res) => {
    const { email: identifier, password } = req.body;
    if (!identifier || !password)
        return res.status(400).json({ error: 'Username/Email and password required' });

    try {
        if (!supabaseAdmin) throw new Error('Identity provider not ready');

        // 1. Prepare Supabase Identifier (handle username vs email)
        const isEmail = identifier.includes('@');
        const loginEmail = isEmail ? identifier.toLowerCase() : `${identifier.toLowerCase()}@mentor.local`;

        // 2. Authenticate with Supabase Auth — with 12s timeout and single retry for concurrency robustness
        const performAuth = async (retryCount = 0) => {
            try {
                const supabaseLoginPromise = supabaseAdmin.auth.signInWithPassword({
                    email: loginEmail,
                    password: password
                });
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Supabase auth timeout')), 12000)
                );
                
                const result = await Promise.race([supabaseLoginPromise, timeoutPromise]);
                if (result.error) throw result.error;
                return result;
            } catch (authError) {
                if ((authError.message === 'timeout' || authError.status === 504) && retryCount < 1) {
                    console.log(`🔄 Retrying auth for ${loginEmail} due to potential concurrency bottleneck...`);
                    return performAuth(retryCount + 1);
                }
                throw authError;
            }
        };

        let authData, authError;
        try {
            const result = await performAuth();
            authData = result.data;
        } catch (err) {
            authError = err;
        }

        if (authError) {
            console.error('Login Failed:', authError.message);
            // Fallback: Check local for Admin/Mentor PIN-based legacy accounts
            const localUser = await get("SELECT * FROM users WHERE (email = ? OR username = ?) AND role IN ('admin', 'mentor')", [identifier, identifier]);
            if (localUser && bcrypt.compareSync(password, localUser.password_hash)) {
                const token = jwt.sign({ id: localUser.id, name: localUser.name, role: localUser.role || 'learner' }, JWT_SECRET, { expiresIn: '30d' });
                return res.json({ token, user: localUser });
            }
            return res.status(401).json({ error: authError.message === 'Supabase auth timeout' ? 'Server is busy, please try again' : 'Invalid credentials' });
        }

        const cloudUser = authData.user;
        const role = cloudUser.user_metadata?.role || 'learner';
        const name = cloudUser.user_metadata?.name || identifier;
        const username = cloudUser.user_metadata?.username || (isEmail ? identifier.split('@')[0] : identifier);

        // 3. Sync to Local Database (Provision on demand)
        await run(`
            INSERT INTO users (id, name, email, username, role, password_hash) 
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET 
                name = excluded.name,
                username = excluded.username,
                role = excluded.role
        `, [cloudUser.id, name, cloudUser.email, username, role, 'CLOUD_AUTH']);

        // 4. Issue the local JWT for session compatibility
        const token = jwt.sign(
            { id: cloudUser.id, name, email: cloudUser.email, role },
            JWT_SECRET, 
            { expiresIn: '30d' }
        );

        res.json({ 
            token, 
            user: { id: cloudUser.id, name, email: cloudUser.email, role } 
        });

    } catch (e) {
        console.error('Login Endpoint Error:', e.message);
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
