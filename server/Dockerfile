# Smart Police Station - backend (Node.js + Express)
# MongoDB (Atlas), Redis (Redis Cloud) and RabbitMQ (CloudAMQP) are EXTERNAL
# services and are configured purely through environment variables at runtime.
# No .env file or secret is ever copied into this image.

FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /app

# Install production dependencies first (better layer caching).
# package-lock.json exists in this repo, so `npm ci` gives reproducible installs.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Application source (.dockerignore keeps .env, node_modules, logs, etc. out).
COPY . .

# Upload directories used by multer. NOTE: container storage is ephemeral on
# Render unless a persistent disk is mounted at /app/uploads.
RUN mkdir -p uploads/evidence uploads/complaints uploads/documents \
    && chown -R node:node /app

# Run as the unprivileged user that ships with the official Node image.
USER node

# Render injects PORT at runtime (default 10000); locally the app falls back to 4000.
# The server binds to 0.0.0.0 (see src/server.js).
EXPOSE 4000

# Identical to `npm start` (= `node src/server.js`), but run directly so that
# SIGTERM/SIGINT reach Node and the graceful-shutdown handler can run.
CMD ["node", "src/server.js"]
