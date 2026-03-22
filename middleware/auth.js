const jwt = require('jsonwebtoken');
const JWT_SECRET = 'mentor_app_jwt_secret_key_2024';

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports.JWT_SECRET = JWT_SECRET;
