const jwt = require('jsonwebtoken');

// Legacy secret for Admin-only sessions
const LEGACY_JWT_SECRET = 'mentor_app_jwt_secret_key_2024';

// Supabase JWT Secret (MUST be added to environment variables for cloud identity)
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

module.exports = (req, res, next) => {
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
                ...decoded
            };
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
