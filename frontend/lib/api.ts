import axios from 'axios';

// Get API URL - validate at runtime, not build time
const getApiBaseUrl = () => {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
  }
  return process.env.NEXT_PUBLIC_API_URL;
};

// For build time, use empty string (will be validated at runtime)
const API_BASE_URL = typeof window !== 'undefined' ? getApiBaseUrl() : '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Validate API URL at runtime
  if (typeof window !== 'undefined' && !config.baseURL) {
    config.baseURL = getApiBaseUrl();
  }
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
