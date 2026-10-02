// Read-only connectivity check for MongoDB, Redis and RabbitMQ.
// Usage:  npm run check:connections         (reads server/.env or real env vars)
// Writes nothing, deletes nothing, and never prints credentials.
import mongoose from 'mongoose';
import Redis from 'ioredis';
import amqp from 'amqplib';
import { env, redactUrl } from '../src/config/env.js';
import dns from "node:dns";

// Local-development workaround for SRV lookups on networks whose default DNS
// cannot resolve mongodb+srv:// records. Kept for development; in production the
// platform DNS is used unless DNS_SERVERS (comma-separated) is explicitly set.
const dnsServers = process.env.DNS_SERVERS
  ? process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean)
  : env.isProduction
    ? ["1.1.1.1", "8.8.8.8"]
    : ["1.1.1.1", "8.8.8.8"];

if (dnsServers.length > 0) {
  dns.setServers(dnsServers);
}

const TIMEOUT_MS = 10000;
const results = [];

const withTimeout = (promise, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS),
    ),
  ]);

const record = (name, ok, detail) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(9)} ${detail}`);
};

const checkMongo = async () => {
  if (!env.mongodbUri) return record('MongoDB', false, 'MONGODB_URI not set');
  try {
    const conn = await withTimeout(
      mongoose.createConnection(env.mongodbUri, { serverSelectionTimeoutMS: TIMEOUT_MS }).asPromise(),
      'MongoDB',
    );
    await conn.db.admin().ping();
    record('MongoDB', true, `ping ok (host: ${conn.host}, db: ${conn.name})`);
    await conn.close();
  } catch (err) {
    record('MongoDB', false, err.message);
  }
};

const checkRedis = async () => {
  if (!env.redisUrl) return record('Redis', false, 'REDIS_URL not set');
  const client = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null });
  client.on('error', () => {});
  try {
    await withTimeout(client.connect(), 'Redis');
    const pong = await withTimeout(client.ping(), 'Redis');
    record('Redis', true, `${pong} (${redactUrl(env.redisUrl)})`);
  } catch (err) {
    record('Redis', false, err.message);
  } finally {
    client.disconnect();
  }
};

const checkRabbit = async () => {
  if (!env.rabbitmqUrl) return record('RabbitMQ', false, 'RABBITMQ_URL not set');
  try {
    const conn = await withTimeout(amqp.connect(env.rabbitmqUrl), 'RabbitMQ');
    const channel = await conn.createChannel();
    await channel.close();
    await conn.close();
    record('RabbitMQ', true, `connected (${redactUrl(env.rabbitmqUrl)})`);
  } catch (err) {
    record('RabbitMQ', false, err.message);
  }
};

console.log(`Checking connections (NODE_ENV=${env.nodeEnv})...`);
await checkMongo();
await checkRedis();
await checkRabbit();

process.exit(results.every((r) => r.ok) ? 0 : 1);
