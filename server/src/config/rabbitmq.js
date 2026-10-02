import amqp from 'amqplib';
import { env, redactUrl } from './env.js';

let amqpConnection = null;
let amqpChannel = null;
let isRabbitAvailable = false;
let shuttingDown = false;
let reconnectTimer = null;

export const QUEUES = {
  NOTIFICATIONS: 'police.notifications',
  SOS_ALERTS: 'police.sos.alerts',
  CASE_UPDATES: 'police.case.updates',
  DAILY_REPORTS: 'police.daily.reports',
  AUDIT_LOGS: 'police.audit.logs'
};

/**
 * @param {{ autoReconnect?: boolean }} options
 *   autoReconnect: retry in the background if the initial connection fails or the
 *   connection drops (used by the API server). The worker leaves this off and
 *   manages its own restart.
 */
export const initRabbitMQ = async ({ autoReconnect = false } = {}) => {
  // No URL (only possible in production when RABBITMQ_URL is unset): stay on the
  // synchronous fallbacks instead of silently connecting to localhost.
  if (!env.rabbitmqUrl) {
    console.warn('RabbitMQ disabled (RABBITMQ_URL not set). Synchronous fallbacks active.');
    return null;
  }

  const scheduleReconnect = () => {
    if (!autoReconnect || shuttingDown || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      initRabbitMQ({ autoReconnect });
    }, 10000);
    reconnectTimer.unref?.();
  };

  try {
    amqpConnection = await amqp.connect(env.rabbitmqUrl);
    amqpChannel = await amqpConnection.createChannel();

    // Assert all required persistent queues
    for (const queueName of Object.values(QUEUES)) {
      await amqpChannel.assertQueue(queueName, { durable: true });
    }

    isRabbitAvailable = true;
    // Never log the full URL - it contains the password.
    console.log('RabbitMQ connected successfully at:', redactUrl(env.rabbitmqUrl));

    amqpConnection.on('error', (err) => {
      isRabbitAvailable = false;
      console.warn('RabbitMQ connection error:', err.message);
    });

    amqpConnection.on('close', () => {
      isRabbitAvailable = false;
      amqpChannel = null;
      amqpConnection = null;
      scheduleReconnect();
    });

    // Without a listener, a channel-level error would crash the process.
    amqpChannel.on('error', (err) => {
      isRabbitAvailable = false;
      console.warn('RabbitMQ channel error:', err.message);
    });

    return { connection: amqpConnection, channel: amqpChannel };
  } catch (err) {
    isRabbitAvailable = false;
    console.warn(`RabbitMQ connection skipped (${err.message}). Synchronous fallbacks active.`);
    scheduleReconnect();
    return null;
  }
};

export const getRabbitChannel = () => amqpChannel;
export const checkRabbitAvailable = () => isRabbitAvailable;

export const closeRabbitMQ = async () => {
  shuttingDown = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  isRabbitAvailable = false;
  const channel = amqpChannel;
  const connection = amqpConnection;
  amqpChannel = null;
  amqpConnection = null;
  try {
    if (channel) await channel.close();
  } catch { /* already closed */ }
  try {
    if (connection) await connection.close();
  } catch { /* already closed */ }
};

export const publishToQueue = async (queue, messageData) => {
  if (isRabbitAvailable && amqpChannel) {
    try {
      const buffer = Buffer.from(JSON.stringify(messageData));
      return amqpChannel.sendToQueue(queue, buffer, { persistent: true });
    } catch (err) {
      console.warn(`Failed to publish to RabbitMQ queue ${queue}:`, err.message);
    }
  }
  return false;
};
