const https = require('https');

const API_URL = 'https://mentor-app-backend-w6bk.onrender.com/api';

async function fetchAPI(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_URL + endpoint);
        const reqOptions = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        };

        const req = https.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) reject(parsed);
                    else resolve(parsed);
                } catch (e) {
                    if (res.statusCode >= 400) reject(new Error(data));
                    else resolve(data);
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

async function run() {
    const login = await fetchAPI('/auth/quantum-login', { 
        method: 'POST', 
        body: { pin: '1234', role: 'mentor' }
    });
    
    const dashboard = await fetchAPI('/mentor/my-students', { 
        headers: { 'Authorization': `Bearer ${login.token}` }
    });
    
    console.log(JSON.stringify(dashboard, null, 2));
}

run();
