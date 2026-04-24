const axios = require('axios');
const c = axios.create({ baseURL: 'http://localhost:3001' });

(async () => {
    const uid = Date.now();
    const email = `uitest_${uid}@test.com`;
    
    let r = await c.post('/api/auth/register', {
        name: `UI Learner ${uid}`,
        email,
        password: 'password123'
    });
    console.log('Registered:', r.data.user?.id || 'OK');

    r = await c.post('/api/auth/login', { email, password: 'password123' });
    const tok = r.data.token;
    const sid = r.data.user.id;
    console.log('Learner ID:', sid);

    r = await c.post('/api/exams/1/submit', {
        answers: [{ q: 1, a: 'A' }]
    }, { headers: { Authorization: 'Bearer ' + tok } });
    console.log('Exam submitted:', r.data.message);

    console.log('\nDONE - Login as Bose (bose / 123123) to see this learner in Alerts');
})();
