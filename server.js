const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();

app.use(cors());
app.options('*', cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/student', require('./routes/student'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/roadmap', require('./routes/roadmap'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/mentor', require('./routes/mentor'));
app.use('/api/admin', require('./routes/admin'));

// Root Health Check for Render "Pulse"
app.get('/', (req, res) => res.json({ 
    status: 'online', 
    version: '1.0.0', 
    service: 'MentorPath API (Pulse)' 
}));

const PORT = process.env.PORT || 3001;

// Init DB first, then start server
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('❌ Database initialization error:', err.message);
    console.log('⚠️ Server will attempt to run in degraded mode...');
    app.listen(PORT, () => {
        console.log(`🚀 Server listening (DEGRADED MODE) on http://localhost:${PORT}`);
    });
});
