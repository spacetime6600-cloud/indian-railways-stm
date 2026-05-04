import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  timeout: 15000, // 15s timeout
});

// ── Request: attach JWT ───────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: handle 401 globally & retry logic ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (error.response?.status === 401) {
      // Token expired or invalid — clear session and redirect to login
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Auto-retry network errors or 5xx on GET requests (up to 2 times)
    if (!config || !config.method || config.method.toLowerCase() !== 'get') {
      return Promise.reject(error);
    }
    config.retryCount = config.retryCount || 0;
    if (config.retryCount >= 2) {
      return Promise.reject(error);
    }
    config.retryCount += 1;
    // Exponential backoff
    const backoff = new Promise((resolve) => setTimeout(resolve, config.retryCount * 500));
    await backoff;
    return api(config);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const loginUser      = (email, password) => api.post('/auth/login', { email, password });
export const registerUser   = (userData)        => api.post('/auth/register', userData);
export const getProfile     = ()                => api.get('/auth/profile');

// ── Trains ────────────────────────────────────────────────────────────────────
export const fetchTrains    = ()           => api.get('/trains');
export const createTrain    = (data)       => api.post('/trains', data);
export const updateTrain    = (id, data)   => api.put(`/trains/${id}`, data);
export const deleteTrain    = (id)         => api.delete(`/trains/${id}`);

// ── Platforms ─────────────────────────────────────────────────────────────────
export const fetchPlatforms  = ()           => api.get('/platforms');
export const createPlatform  = (data)       => api.post('/platforms', data);
export const updatePlatform  = (id, data)   => api.put(`/platforms/${id}`, data);
export const deletePlatform  = (id)         => api.delete(`/platforms/${id}`);

// ── Alerts ────────────────────────────────────────────────────────────────────
export const fetchAlerts     = ()           => api.get('/alerts');
export const createAlert     = (data)       => api.post('/alerts', data);
export const resolveAlert    = (id)         => api.put(`/alerts/${id}/resolve`);
export const deleteAlert     = (id)         => api.delete(`/alerts/${id}`);

// ── Analytics ─────────────────────────────────────────────────────────────────
export const fetchAnalyticsOverview  = () => api.get('/analytics/overview');
export const fetchAnalyticsDelays    = () => api.get('/analytics/delays');
export const fetchAnalyticsPerf      = () => api.get('/analytics/performance');

// ── Maintenance ───────────────────────────────────────────────────────────────
export const fetchMaintenance        = ()           => api.get('/maintenance');
export const createMaintenance       = (data)       => api.post('/maintenance', data);
export const updateMaintenance       = (id, data)   => api.put(`/maintenance/${id}`, data);
export const deleteMaintenance       = (id)         => api.delete(`/maintenance/${id}`);

// ── Users ─────────────────────────────────────────────────────────────────────
export const fetchUsers   = (params = {}) => api.get('/users', { params });
export const getUserById  = (id)          => api.get(`/users/${id}`);
export const updateUser   = (id, data)    => api.put(`/users/${id}`, data);
export const deleteUser   = (id)          => api.delete(`/users/${id}`);

// ── AI / ML ───────────────────────────────────────────────────────────────────
export const getAIHealth          = ()       => api.get('/ai/health');
export const getNetworkSnapshot   = ()       => api.get('/ai/network-snapshot');
export const getTrainInsights     = (id)     => api.get(`/ai/train/${id}/insights`);
export const predictDelay         = (data)   => api.post('/ai/predict-delay', data);
export const predictCongestion    = (data)   => api.post('/ai/predict-congestion', data);
export const predictAlert         = (data)   => api.post('/ai/predict-alert', data);
export const predictMaintenance   = (data)   => api.post('/ai/predict-maintenance', data);

export default api;
