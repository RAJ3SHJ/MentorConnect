import axios from 'axios';

// For Expo, use EXPO_PUBLIC_ prefix for environment variables
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

console.log('🌐 API Base URL:', BASE_URL);

const api = axios.create({
    baseURL: BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

// Add interceptor for easier debugging on physical devices
api.interceptors.response.use(
    response => response,
    error => {
        console.error('❌ API Error:', error.message, error.config?.url);
        return Promise.reject(error);
    }
);

export default api;
