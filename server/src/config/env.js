import dotenv from "dotenv";

// Loads server/.env for local development. In production (Render, Docker) real
// environment variables are injected by the platform and no .env file exists.
dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

const stripTrailingSlash = (value) =>
  value ? value.trim().replace(/\/+$/, "") : value;

// Non-sensitive development defaults. These are ONLY applied outside production,
// so a production deploy can never silently talk to localhost.
const devDefault = (value, fallback) => value || (isProduction ? undefined : fallback);

const port = parseInt(process.env.PORT || "4000", 10);

// CLIENT_URL may be a single origin or a comma-separated list of origins.
const clientUrls = (devDefault(process.env.CLIENT_URL, "http://localhost:5173") || "")
  .split(",")
  .map((origin) => stripTrailingSlash(origin))
  .filter(Boolean);

export const env = {
  nodeEnv,
  isProduction,

  port,
  // Bind address. Must be 0.0.0.0 inside containers / on Render.
  host: process.env.HOST || "0.0.0.0",

  mongodbUri: devDefault(
    process.env.MONGODB_URI,
    "mongodb://127.0.0.1:27017/smart-police-station",
  ),

  redisUrl: devDefault(process.env.REDIS_URL, "redis://127.0.0.1:6379"),

  rabbitmqUrl: devDefault(process.env.RABBITMQ_URL, "amqp://127.0.0.1:5672"),

  // No defaults for secrets: a missing secret must fail loudly, never fall back.
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,

  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,

  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",

  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  clientUrl: clientUrls[0],
  clientUrls,

  apiBaseUrl: stripTrailingSlash(
    devDefault(process.env.API_BASE_URL, `http://localhost:${port}`),
  ),

  // Number of reverse-proxy hops in front of the app (Render = 1).
  // Needed so req.ip / rate limiting see the real client IP.
  trustProxy: process.env.TRUST_PROXY
    ? Number.isNaN(Number(process.env.TRUST_PROXY))
      ? process.env.TRUST_PROXY
      : Number(process.env.TRUST_PROXY)
    : isProduction
      ? 1
      : false,

  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,

  aiApiKey: process.env.AI_API_KEY,

  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,

  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,

  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,

  sosNearbyRadiusKm: parseFloat(process.env.SOS_NEARBY_RADIUS_KM || "5"),

  sosExpandedRadiusKm: parseFloat(process.env.SOS_EXPANDED_RADIUS_KM || "20"),

  sosLocationFreshnessMinutes: parseInt(
    process.env.SOS_LOCATION_FRESHNESS_MINUTES || "10",
    10,
  ),

  sosAckTimeoutSeconds: parseInt(
    process.env.SOS_ACK_TIMEOUT_SECONDS || "60",
    10,
  ),

  admin: {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
};

const PLACEHOLDER_PATTERN = /^(replace[_-]?me|changeme|change[_-]?me|your[_-].*|example|secret|password)$/i;

const isPlaceholder = (value) => !value || PLACEHOLDER_PATTERN.test(value.trim());

/**
 * Validates the environment at startup. Call from server.js / worker.js
 * (NOT at import time, so seed scripts and tests keep working).
 *
 * - API (default): MongoDB URI and both JWT secrets are required.
 * - Worker ({ worker: true }): only MongoDB and RabbitMQ are needed.
 * - Production: additionally requires CLIENT_URL and API_BASE_URL (API only),
 *   rejects placeholder / short / identical JWT secrets, and rejects localhost URLs.
 * Throws one Error listing every problem so the deploy log is actionable.
 * Never prints secret values.
 */
export const validateEnv = ({ worker = false } = {}) => {
  const errors = [];
  const warnings = [];

  if (!env.mongodbUri) errors.push("MONGODB_URI is required.");
  if (!worker && isPlaceholder(env.jwtAccessSecret)) {
    errors.push("JWT_ACCESS_SECRET is missing or still a placeholder.");
  }
  if (!worker && isPlaceholder(env.jwtRefreshSecret)) {
    errors.push("JWT_REFRESH_SECRET is missing or still a placeholder.");
  }

  if (isProduction) {
    const isLocal = (url) => /(^|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])([:/]|$)/i.test(url || "");

    if (!worker) {
      if (env.jwtAccessSecret && env.jwtAccessSecret.length < 32) {
        errors.push("JWT_ACCESS_SECRET must be at least 32 characters in production.");
      }
      if (env.jwtRefreshSecret && env.jwtRefreshSecret.length < 32) {
        errors.push("JWT_REFRESH_SECRET must be at least 32 characters in production.");
      }
      if (env.jwtAccessSecret && env.jwtAccessSecret === env.jwtRefreshSecret) {
        errors.push("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.");
      }

      if (!env.clientUrl) errors.push("CLIENT_URL is required in production (your frontend origin).");
      if (env.clientUrls.some(isLocal)) errors.push("CLIENT_URL must not point to localhost in production.");
      if (env.clientUrls.includes("*")) errors.push("CLIENT_URL must not be '*' (credentials are enabled).");
      if (!env.apiBaseUrl) errors.push("API_BASE_URL is required in production (public URL of this backend).");
      if (isLocal(env.apiBaseUrl)) errors.push("API_BASE_URL must not point to localhost in production.");
    }
    if (isLocal(env.mongodbUri)) errors.push("MONGODB_URI must not point to localhost in production (use MongoDB Atlas).");

    if (!env.redisUrl) {
      warnings.push("REDIS_URL is not set - Redis is disabled and in-memory fallbacks are used.");
    } else if (isLocal(env.redisUrl)) {
      errors.push("REDIS_URL must not point to localhost in production.");
    }
    if (!env.rabbitmqUrl) {
      warnings.push("RABBITMQ_URL is not set - RabbitMQ is disabled and synchronous fallbacks are used.");
    } else if (isLocal(env.rabbitmqUrl)) {
      errors.push("RABBITMQ_URL must not point to localhost in production.");
    }
  }

  warnings.forEach((w) => console.warn(`[env] WARNING: ${w}`));

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n  - ${errors.join("\n  - ")}`,
    );
  }
};

/**
 * Returns a connection URL safe to log (credentials stripped).
 */
export const redactUrl = (url) => {
  if (!url) return "(not set)";
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : ""}`;
  } catch {
    return "(unparseable url)";
  }
};
