const jwt = require('jsonwebtoken');
const { run, get } = require('../db');

// Legacy secret for Admin-only sessions
const LEGACY_JWT_SECRET = 'mentor_app_jwt_secret_key_2024';

// Supabase JWT Secret (MUST be added to environment variables for cloud identity)
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

module.exports = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Identity token required' });

    // 1. Try verifying as a Supabase Cloud User
    if (SUPABASE_JWT_SECRET) {
        try {
            const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
            // Supabase puts user info in 'sub' and 'user_metadata'
            req.user = {
                id: decoded.sub,
                email: decoded.email,
                role: decoded.user_metadata?.role || 'learner',
                name: decoded.user_metadata?.name || decoded.email?.split('@')[0] || 'Learner',
                ...decoded
            };

            // AUTO-PROVISION & STATUS CHECK: Ensure user exists and is active
            try {
                const dbUser = await get('SELECT id, is_active FROM users WHERE id = ?', [req.user.id]);
                if (!dbUser) {
                    console.log(`🆕 Auto-provisioning new cloud user: ${req.user.email} (${req.user.id})`);
                    await run(`
                        INSERT INTO users (id, name, email, role, password_hash, is_active)
                        VALUES (?, ?, ?, ?, ?, 1)
                    `, [req.user.id, req.user.name, req.user.email, req.user.role, 'CLOUD_AUTH']);
                } else if (dbUser.is_active === 0 || dbUser.is_active === false) {
                    return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
                }
            } catch (authDbError) {
                console.error('⚠️ Auth Provisioning/Status Warning:', authDbError.message);
            }
            return next();
        } catch (e) {
            // If it failed Supabase check, we continue to check Legacy/Admin
            console.log('💡 Not a Supabase token, checking legacy...');
        }
    }

    // 2. Fallback to Legacy/Admin Verification
    try {
        const decoded = jwt.verify(token, LEGACY_JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired identity token' });
    }
};

module.exports.JWT_SECRET = LEGACY_JWT_SECRET;
