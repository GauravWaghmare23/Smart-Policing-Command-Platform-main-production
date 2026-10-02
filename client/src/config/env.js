// Central place for build-time configuration.
// NOTE: every VITE_* variable is embedded in the public browser bundle.
// Never put secrets here - only public URLs and browser-restricted keys.

const trimSlash = (value) => (value || '').trim().replace(/\/+$/, '');

// VITE_API_URL is the canonical name. VITE_API_BASE_URL is accepted as a legacy alias.
const configuredApiUrl = trimSlash(
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL,
);

// The localhost fallback exists ONLY for `vite dev`. import.meta.env.DEV is
// statically false in production builds, so it is stripped from the bundle.
export const API_URL =
  configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:4000/api' : '');

// Socket.IO lives on the same host as the API, without the /api suffix.
export const SOCKET_URL =
  trimSlash(import.meta.env.VITE_SOCKET_URL) || API_URL.replace(/\/api$/, '');

if (!API_URL) {
  console.error(
    '[config] VITE_API_URL is not set. Set it at build time, e.g. ' +
      'VITE_API_URL=https://<your-backend>.onrender.com/api',
  );
}
