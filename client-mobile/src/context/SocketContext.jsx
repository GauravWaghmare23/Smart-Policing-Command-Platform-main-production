import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';
import { useAuth } from './AuthContext';
import {
  notifySOSAcknowledged,
  notifySOSDispatched,
  notifySOSResolved,
  notifyComplaintUpdate,
  notifyAnnouncement,
} from '../services/push.service';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // Global real-time state — other screens subscribe to these
  const [lastSOSUpdate, setLastSOSUpdate] = useState(null);
  const [lastNotification, setLastNotification] = useState(null);
  const [lastAnnouncement, setLastAnnouncement] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SOCKET] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[SOCKET] Connection error:', err.message);
    });

    // ── Global SOS updates ──────────────────────────────────────────
    const handleSOSUpdate = (payload) => {
      const sos = payload?.sos || payload;
      if (!sos) return;
      setLastSOSUpdate(sos);

      const status = (sos.status || '').toUpperCase();
      if (status === 'ACKNOWLEDGED') {
        notifySOSAcknowledged();
      } else if (status === 'DISPATCHED') {
        notifySOSDispatched(sos.officer?.name || sos.officerName);
      } else if (status === 'RESOLVED' || status === 'CLOSED') {
        notifySOSResolved();
      }
    };

    socket.on('sos:updated', handleSOSUpdate);
    socket.on('sos:acknowledged', handleSOSUpdate);
    socket.on('sos:dispatched', handleSOSUpdate);
    socket.on('sos:resolved', handleSOSUpdate);
    socket.on('sos:escalated', handleSOSUpdate);

    // ── Global notification:new ─────────────────────────────────────
    const handleNotificationNew = (payload) => {
      const notif = payload?.notification || payload;
      if (!notif) return;
      setLastNotification(notif);
      // Show local push for backend-generated notifications
      notifyComplaintUpdate(notif.title || 'Update', notif.message || '');
    };
    socket.on('notification:new', handleNotificationNew);

    // ── Announcements ───────────────────────────────────────────────
    const handleAnnouncementNew = (payload) => {
      const ann = payload?.announcement || payload;
      if (!ann) return;
      setLastAnnouncement(ann);
      notifyAnnouncement(ann.title || 'Public Safety Alert', ann.message || '');
    };
    socket.on('announcement:new', handleAnnouncementNew);

    return () => {
      socket.off('sos:updated', handleSOSUpdate);
      socket.off('sos:acknowledged', handleSOSUpdate);
      socket.off('sos:dispatched', handleSOSUpdate);
      socket.off('sos:resolved', handleSOSUpdate);
      socket.off('sos:escalated', handleSOSUpdate);
      socket.off('notification:new', handleNotificationNew);
      socket.off('announcement:new', handleAnnouncementNew);
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [accessToken, isAuthenticated]);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        on,
        off,
        emit,
        lastSOSUpdate,
        lastNotification,
        lastAnnouncement,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
