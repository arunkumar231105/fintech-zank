import axios from 'axios';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
const API_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 30000);

let refreshPromise = null;
let requestSequence = 0;

function getStoredToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem('accessToken');
}

function setStoredToken(token) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('accessToken', token);
  }
}

function clearStoredToken() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('accessToken');
  }
}

function redirectToLogin() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
    window.location.href = '/auth/login';
  }
}

export function normalizeApiError(error) {
  if (error?.message && typeof error.status !== 'undefined' && !error.response) {
    return error;
  }

  if (error?.response?.status === 401) {
    return { status: 401, message: 'Session expired. Please sign in again.' };
  }

  if (error?.response?.status === 403) {
    return { status: 403, message: 'Action not allowed.' };
  }

  if (error?.response?.status === 404) {
    return { status: 404, message: error.response?.data?.detail || 'Not found.' };
  }

  if (error?.response?.data?.detail) {
    return { status: error.response.status, message: error.response.data.detail };
  }

  if (error?.response?.data?.message) {
    return { status: error.response.status, message: error.response.data.message };
  }

  if (error?.message === 'Network Error') {
    return { status: 0, message: 'Server unavailable, try again later.' };
  }

  if (error?.code === 'ECONNABORTED') {
    return { status: 0, message: 'Request timed out. Please try again.' };
  }

  return { status: error?.response?.status || 0, message: 'Connection failed, try again.' };
}

async function refreshAccessToken() {
  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh-token`,
    {},
    { withCredentials: true }
  );

  if (response.data?.accessToken) {
    setStoredToken(response.data.accessToken);
    return response.data.accessToken;
  }

  throw new Error('Unable to refresh session');
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: API_TIMEOUT_MS,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  requestSequence += 1;
  config.headers['X-Request-ID'] = `web-${Date.now()}-${requestSequence}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error?.response?.status;

    if (status === 401 && !originalRequest._retry && !String(originalRequest.url || '').includes('/auth/')) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }

        const nextToken = await refreshPromise;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearStoredToken();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export function clearSessionToken() {
  clearStoredToken();
}
