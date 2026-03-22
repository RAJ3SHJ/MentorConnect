import axios from 'axios';

// For Expo, use EXPO_PUBLIC_ prefix for environment variables
// This allows the app to connect to a remote backend when deployed (e.g. Netlify)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
    baseURL: BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000, // Increased timeout for potentially slow remote connections
});

export default api;
