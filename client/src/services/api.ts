import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

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

// --- In-Flight Request Deduplication & In-Memory Client Cache ---
interface CacheItem {
  data: any;
  timestamp: number;
}

const clientCache = new Map<string, CacheItem>();
const inFlightRequests = new Map<string, Promise<AxiosResponse<any>>>();

// Cache TTL: 15 seconds for idempotent GET requests
const DEFAULT_TTL_MS = 15000;

/**
 * Generate a deterministic cache key from URL and params
 */
const getCacheKey = (url: string, params?: any) => {
  if (!params) return url;
  const queryString = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  return `${url}?${queryString}`;
};

/**
 * Cached GET helper with in-flight deduplication
 */
export const cachedGet = async <T = any>(
  url: string, 
  config?: AxiosRequestConfig, 
  ttlMs = DEFAULT_TTL_MS
): Promise<{ data: T; fromCache?: boolean }> => {
  const cacheKey = getCacheKey(url, config?.params);

  // 1. Check valid cached response
  const cached = clientCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return { data: cached.data, fromCache: true };
  }

  // 2. Check identical in-flight request deduplication
  if (inFlightRequests.has(cacheKey)) {
    const res = await inFlightRequests.get(cacheKey)!;
    return { data: res.data };
  }

  // 3. Dispatch fresh request and track in-flight promise
  const requestPromise = api.get<T>(url, config);
  inFlightRequests.set(cacheKey, requestPromise);

  try {
    const res = await requestPromise;
    clientCache.set(cacheKey, { data: res.data, timestamp: Date.now() });
    return { data: res.data };
  } finally {
    inFlightRequests.delete(cacheKey);
  }
};

/**
 * Invalidate client cache by prefix or specific key (call after mutations)
 */
export const invalidateClientCache = (prefix?: string) => {
  if (!prefix) {
    clientCache.clear();
    return;
  }
  for (const key of clientCache.keys()) {
    if (key.includes(prefix)) {
      clientCache.delete(key);
    }
  }
};

// Attach Authorization header if JWT token is stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nsc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Automatically invalidate cache on mutating methods (POST, PUT, DELETE)
  const method = config.method?.toUpperCase();
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    // Invalidate dashboard and lists
    invalidateClientCache();
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
      invalidateClientCache();
      window.dispatchEvent(new Event('nsc_unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
