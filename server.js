const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();

app.use(cors());
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

app.get('/', (req, res) => res.json({ status: 'Mentor App API running 🚀' }));

const PORT = process.env.PORT || 3001;

// Init DB first, then start server
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
});
