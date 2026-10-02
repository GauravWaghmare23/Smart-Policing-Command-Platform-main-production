import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/env';

let socket = null;

export const initSocket = () => {
  const token = localStorage.getItem('accessToken');
  const socketUrl = SOCKET_URL;

  // If socket already connected with same token, reuse it
  if (socket && socket.connected) {
    return socket;
  }

  // Disconnect stale socket before creating a new one
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(socketUrl, {
    auth: { token },
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[SOCKET] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[SOCKET] Disconnected:', reason);
    // Attempt auto-reconnect on server-side disconnect
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });

  socket.on('connect_error', (err) => {
    console.warn('[SOCKET] Connection error:', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
