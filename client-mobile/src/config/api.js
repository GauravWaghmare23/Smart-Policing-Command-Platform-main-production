// API configuration.
// EXPO_PUBLIC_* values are inlined into the JS bundle at build time and are PUBLIC.
// Never put secrets in EXPO_PUBLIC_* variables.
//
//   Development : EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:4000/api   (in client-mobile/.env)
//   Production  : EXPO_PUBLIC_API_URL=https://<render-backend-url>/api (EAS environment variable)

const configuredUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');

// The localhost fallback only applies in development (__DEV__). A production
// build without EXPO_PUBLIC_API_URL fails loudly instead of calling localhost.
export const API_URL = configuredUrl || (__DEV__ ? 'http://localhost:4000/api' : '');

if (!API_URL) {
  console.error('[config] EXPO_PUBLIC_API_URL is not set. Configure it in your EAS environment.');
}

// Socket.IO is served from the same host as the API, without the trailing /api.
export const SOCKET_URL = API_URL.replace(/\/api$/, '');
