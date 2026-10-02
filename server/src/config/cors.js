import { env } from './env.js';

// Local development origins. Only honoured outside production.
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

export const getAllowedOrigins = () => {
  const origins = new Set(env.clientUrls);
  if (!env.isProduction) DEV_ORIGINS.forEach((o) => origins.add(o));
  return origins;
};

/**
 * Shared origin check for Express CORS and Socket.IO CORS.
 * - Requests with no Origin header (mobile app, curl, health checks) are allowed;
 *   CORS is a browser-only mechanism and those clients authenticate with JWTs.
 * - Browser origins must exactly match CLIENT_URL (plus localhost in development).
 * - Never reflects arbitrary origins, so credentials stay safe.
 */
export const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (getAllowedOrigins().has(origin)) return callback(null, true);
  return callback(null, false);
};
