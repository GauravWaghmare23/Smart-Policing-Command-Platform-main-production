import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/api';

const isValidObjectId = (id) => {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
};

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor: Attach JWT Bearer Token if available & development logging
apiClient.interceptors.request.use(
  async (config) => {
    // 1. Development logging (never log JWT tokens or passwords)
    if (__DEV__) {
      const fullUrl = axios.getUri(config);
      console.log(`[API] ${config.method?.toUpperCase()} ${fullUrl}`);
      console.log(`[AUTH] API BASE URL: ${API_URL}`);
    }

    // 2. Guard against invalid IDs in URL path params for explicit ID placeholders
    // (e.g. check for 'undefined' or 'null' literals in URL string, but do not split on '/')
    if (
      config.url.includes('/undefined') ||
      config.url.includes('/null') ||
      config.url.includes('/NaN')
    ) {
      return Promise.reject(
        new Error(`Blocked invalid URL parameter in ${config.url}`)
      );
    }

    // 3. Attach Authorization header
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) {
      // SecureStore fallback
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: Handle errors & automatic 401 session clearing
let onUnauthorizedCallback = null;

export const setUnauthorizedHandler = (handler) => {
  onUnauthorizedCallback = handler;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    let message = 'An unexpected error occurred.';
    if (!error.response) {
      message = error.message || 'Network error. Please check your internet connection and LAN setup.';
    } else {
      const status = error.response.status;
      const dataMsg = error.response.data?.message;
      if (status === 401) {
        message = dataMsg || 'Session expired. Please sign in again.';
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
      } else if (status === 403) {
        message = dataMsg || 'Forbidden. You do not have permission for this action.';
      } else if (status === 404) {
        message = dataMsg || 'Resource not found.';
      } else if (status >= 500) {
        message = dataMsg || 'Server error. Please try again later.';
      } else {
        message = dataMsg || message;
      }
    }
    const formattedError = new Error(message);
    formattedError.status = error.response?.status;
    formattedError.originalError = error;
    return Promise.reject(formattedError);
  }
);

export { isValidObjectId };
export default apiClient;
