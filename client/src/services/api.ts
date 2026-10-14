import axios from 'axios';

// Base API URL resolution
const getBaseURL = () => {
  let envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return 'http://localhost:5000/api';
  }
  // Trim trailing slash
  envUrl = envUrl.trim().replace(/\/+$/, '');
  // Append /api if not present
  if (!envUrl.endsWith('/api')) {
    envUrl = `${envUrl}/api`;
  }
  return envUrl;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization header if JWT token is stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nsc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 unauthorized to clear tokens without hard reload loops
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('nsc_token');
      localStorage.removeItem('nsc_admin');
      // Trigger storage event so React App can catch auth state change gracefully if needed
      window.dispatchEvent(new Event('nsc_unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
