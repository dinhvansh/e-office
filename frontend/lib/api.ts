import axios from 'axios';
import { getApiUrl } from './env';

const api = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  let token: string | null = null;
  try {
    const authRaw = localStorage.getItem('esign.auth');
    token = authRaw ? JSON.parse(authRaw)?.tokens?.accessToken ?? null : null;
  } catch {
    token = null;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
