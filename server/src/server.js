import http from 'http';
import app from './app.js';
import { connectDB, disconnectDB } from './config/database.js';
import { initRedis, closeRedis } from './config/redis.js';
import { initRabbitMQ, closeRabbitMQ } from './config/rabbitmq.js';
import { initSocket, getIO } from './sockets/socket.js';
import { env, validateEnv } from './config/env.js';

const SHUTDOWN_TIMEOUT_MS = 10000;

const startServer = async () => {
  // 0. Fail fast (and clearly) on missing/insecure production configuration
  validateEnv();

  // 1. Connect to MongoDB
  await connectDB();

  // 2. Initialize Redis Client
  initRedis();

  // 3. Initialize RabbitMQ Queues (keeps retrying in the background if unavailable)
  await initRabbitMQ({ autoReconnect: true });

  // 4. Create HTTP Server
  const server = http.createServer(app);

  // Render's load balancer keeps connections alive ~60s+; Node's 5s default
  // can cause intermittent 502s. Keep these above the proxy idle timeout.
  server.keepAliveTimeout = 65 * 1000;
  server.headersTimeout = 66 * 1000;

  // 5. Initialize Socket.IO with Redis
  initSocket(server);

  // 6. Start Server Listening (0.0.0.0 so it is reachable inside Docker / on Render)
  server.listen(env.port, env.host, () => {
    console.log(`🚔 Smart Police Station server running in ${env.nodeEnv} mode on ${env.host}:${env.port}`);
  });

  registerShutdown(server);
};

let shuttingDown = false;

const registerShutdown = (server) => {
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received. Shutting down gracefully...`);

    // Hard stop if something hangs so the platform can restart us.
    const forceExit = setTimeout(() => {
      console.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      // Stop accepting new connections, close Socket.IO clients, then dependencies.
      const io = getIO();
      await Promise.all([
        new Promise((resolve) => server.close(() => resolve())),
        io ? new Promise((resolve) => io.close(() => resolve())) : Promise.resolve(),
      ]);
      await closeRabbitMQ();
      await closeRedis();
      await disconnectDB();
      console.log('Shutdown complete.');
      process.exit(0);
    } catch (err) {
      console.error(`Error during shutdown: ${err.message}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((error) => {
  console.error(`Fatal Server Error: ${error.message}`);
  process.exit(1);
});
