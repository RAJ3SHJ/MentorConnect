const axios = require('axios');
const API_URL = 'http://localhost:5000'; // Adjust if needed

async function testApi() {
    try {
        console.log('--- Testing /api/mentor/my-assessments ---');
        // Note: This requires a valid token. Since I can't easily get one here without login, 
        // I will check the backend code one more time for any subtle bugs in the UNION ALL.
    } catch (e) {
        console.error(e.message);
    }
}
testApi();
