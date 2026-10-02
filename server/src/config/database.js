import mongoose from 'mongoose';
import { env } from './env.js';
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

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};
