import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, StatusBar, TouchableOpacity } from 'react-native';
import { getMyNotifications, markNotificationAsRead } from '../../src/services/notification.service';
import { useSocket } from '../../src/context/SocketContext';
import Card from '../../src/components/Card';
import Loading from '../../src/components/Loading';
import EmptyState from '../../src/components/EmptyState';
import ErrorState from '../../src/components/ErrorState';

export default function NotificationsScreen() {
  const { on, off } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      setError(null);
      const data = await getMyNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time notifications via Socket.IO
  useEffect(() => {
    const handleNewNotif = (newNotif) => {
      if (newNotif) {
        setNotifications((prev) => [newNotif, ...prev]);
      }
    };

    on('notification:new', handleNewNotif);
    on('announcement:new', handleNewNotif);

    return () => {
      off('notification:new', handleNewNotif);
      off('announcement:new', handleNewNotif);
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkRead = async (item) => {
    if (item.isRead) return;
    try {
      await markNotificationAsRead(item._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
      );
    } catch (_) {}
  };

  if (loading) return <Loading message="Loading notifications..." />;
  if (error) return <ErrorState message={error} onRetry={fetchNotifications} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>Notifications & Announcements</Text>
        <Text style={styles.sub}>{notifications.length} notification(s)</Text>
      </View>

      {notifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="No Notifications"
          message="Police station updates on your SOS, complaints, and FIRs will appear here."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D4ED8" />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleMarkRead(item)} activeOpacity={0.85}>
              <Card style={!item.isRead ? styles.unreadCard : undefined}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title || 'Police System Notification'}</Text>
                  {!item.isRead && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.cardDesc}>{item.message || item.body || item.content}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  sub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: '#1D4ED8', backgroundColor: '#EFF6FF' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1D4ED8' },
  cardDesc: { fontSize: 13, color: '#475569', marginVertical: 6, lineHeight: 18 },
  date: { fontSize: 11, color: '#94A3B8' },
});
