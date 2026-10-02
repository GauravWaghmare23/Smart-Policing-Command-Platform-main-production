import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket, initSocket } from '../../socket/socket';
import { notificationApi } from '../../api/notification.api';
import { Bell, CheckCheck, X, Siren, Megaphone, AlertTriangle } from 'lucide-react';

// ─── Voice Alert (Web Speech API) ───────────────────────────────────
function speakAlert(text) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    // Prefer a clear English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === 'en-IN' || v.lang === 'en-US');
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}

// ─── Notification type helpers ───────────────────────────────────────
function getNotifIcon(type) {
  if (type === 'sos') return <Siren className="h-4 w-4 text-red-400 flex-shrink-0" />;
  if (type === 'announcement') return <Megaphone className="h-4 w-4 text-amber-400 flex-shrink-0" />;
  return <Bell className="h-4 w-4 text-blue-400 flex-shrink-0" />;
}

function getNotifBorderClass(type) {
  if (type === 'sos') return 'border-l-2 border-red-500 bg-red-950/40';
  if (type === 'announcement') return 'border-l-2 border-amber-500 bg-amber-950/30';
  return 'border-l-2 border-blue-500 bg-slate-800/80';
}

// ─── Main Component ──────────────────────────────────────────────────
const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellPulse, setBellPulse] = useState(false);
  const socketRef = useRef(null);
  const panelRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getAll();
      if (res.success && res.data.notifications) {
        const notifs = res.data.notifications;
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.isRead).length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const addLiveItem = useCallback((item, type) => {
    setNotifications((prev) => [item, ...prev]);
    setUnreadCount((prev) => prev + 1);
    // Pulse bell animation
    setBellPulse(true);
    setTimeout(() => setBellPulse(false), 2000);
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Ensure socket is initialized (may have been created in AuthContext)
    const socket = getSocket() || initSocket();
    socketRef.current = socket;

    if (!socket) return;

    // ── Notification:new ────────────────────────────────────────────
    const handleNotification = (data) => {
      const notif = data?.notification || data;
      if (!notif) return;
      addLiveItem({ ...notif, _clientType: 'notification' }, 'notification');
    };
    socket.on('notification:new', handleNotification);

    // ── SOS:new (admin/police see new incoming SOS) ─────────────────
    const handleSOSNew = (data) => {
      const sos = data?.sos || data;
      if (!sos) return;
      const item = {
        _id: `sos-${sos._id || Date.now()}`,
        title: '🚨 EMERGENCY SOS RECEIVED',
        message: `Citizen requires immediate assistance. Location: ${sos.address || `(${sos.latitude?.toFixed(4)}, ${sos.longitude?.toFixed(4)})`}`,
        isRead: false,
        createdAt: sos.createdAt || new Date().toISOString(),
        _clientType: 'sos',
      };
      addLiveItem(item, 'sos');
      speakAlert('Emergency S O S received. A citizen requires immediate police assistance.');
    };
    socket.on('sos:new', handleSOSNew);

    // ── SOS:updated ─────────────────────────────────────────────────
    const handleSOSUpdate = (data) => {
      const sos = data?.sos || data;
      if (!sos) return;
      const status = (sos.status || '').toUpperCase();
      if (status === 'ESCALATED') {
        const item = {
          _id: `sos-esc-${sos._id || Date.now()}`,
          title: '⚠️ SOS ESCALATED',
          message: `SOS Alert has been escalated and requires urgent attention.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          _clientType: 'sos',
        };
        addLiveItem(item, 'sos');
        speakAlert('Warning. S O S alert has been escalated and requires urgent attention.');
      }
    };
    socket.on('sos:updated', handleSOSUpdate);
    socket.on('sos:escalated', handleSOSUpdate);

    // ── Announcement:new ────────────────────────────────────────────
    const handleAnnouncement = (data) => {
      const ann = data?.announcement || data;
      if (!ann) return;
      const item = {
        _id: `ann-${ann._id || Date.now()}`,
        title: ann.title || 'Public Safety Announcement',
        message: ann.message || '',
        isRead: false,
        createdAt: ann.createdAt || new Date().toISOString(),
        _clientType: 'announcement',
      };
      addLiveItem(item, 'announcement');
      // Voice for HIGH/CRITICAL severity
      const sev = (ann.severity || '').toUpperCase();
      if (sev === 'HIGH' || sev === 'CRITICAL' || !ann.severity) {
        speakAlert(`Public Safety Alert. ${ann.title || 'New announcement'}. ${ann.message || ''}`);
      }
    };
    socket.on('announcement:new', handleAnnouncement);

    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('sos:new', handleSOSNew);
      socket.off('sos:updated', handleSOSUpdate);
      socket.off('sos:escalated', handleSOSUpdate);
      socket.off('announcement:new', handleAnnouncement);
    };
  }, [addLiveItem]);

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleMarkRead = async (item) => {
    if (item.isRead) return;
    // Only API-persisted notifications (not live SOS/announcement items) need API call
    if (!item._clientType || item._clientType === 'notification') {
      try {
        await notificationApi.markRead(item._id);
      } catch (_) {}
    }
    setNotifications((prev) => prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 focus:outline-none transition-colors ${
          bellPulse ? 'text-red-400' : 'text-slate-300 hover:text-white'
        }`}
        title="Notifications & Alerts"
      >
        <Bell className={`h-5 w-5 transition-transform ${bellPulse ? 'animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-400" />
              Operational Alerts
              {unreadCount > 0 && (
                <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-950/50 border-b border-slate-800/50">
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Siren className="h-3 w-3 text-red-400" /> SOS
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Megaphone className="h-3 w-3 text-amber-400" /> Announcement
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Bell className="h-3 w-3 text-blue-400" /> System
            </span>
          </div>

          {/* Notification List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Bell className="h-8 w-8 mx-auto mb-3 text-slate-700" />
                No notifications yet. SOS, announcement, and system events will appear here.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleMarkRead(n)}
                  className={`p-3 cursor-pointer transition-colors hover:bg-slate-800 ${
                    n.isRead
                      ? 'bg-slate-900 text-slate-400'
                      : getNotifBorderClass(n._clientType)
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {getNotifIcon(n._clientType)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`font-semibold text-xs truncate ${
                          n._clientType === 'sos' ? 'text-red-300' :
                          n._clientType === 'announcement' ? 'text-amber-300' :
                          'text-blue-300'
                        }`}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-500 flex-shrink-0">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-center">
              <span className="text-[10px] text-slate-500">
                {notifications.length} total · {unreadCount} unread · Voice alerts active
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
