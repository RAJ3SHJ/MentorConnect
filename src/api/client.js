import axios from 'axios';

// Change this to your machine's local IP when testing on a physical device
// E.g. 'http://192.168.1.100:3001'
const BASE_URL = 'http://localhost:3001';

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
});

export default api;
