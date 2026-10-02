import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';
import { getCurrentLocation, watchLocation } from '../../src/services/location.service';
import apiClient from '../../src/services/apiClient';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const { isConnected, socket, lastAnnouncement, lastSOSUpdate, lastNotification } = useSocket();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const [unreadCount, setUnreadCount] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [officerDuty, setOfficerDuty] = useState('AVAILABLE');
  const [activeSOSDispatches, setActiveSOSDispatches] = useState([]);
  const [activePatrols, setActivePatrols] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const locationSubRef = useRef(null);
  const bannerAnim = useRef(new Animated.Value(0)).current;

  const isPolice = ['STATION_HEAD', 'INVESTIGATING_OFFICER', 'FIELD_OFFICER'].includes(user?.role);

  const checkConnectivity = async () => {
    try {
      await apiClient.get('/auth/me');
      setApiStatus('connected');
    } catch {
      setApiStatus('error');
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await apiClient.get('/announcements');
      const list = res.data?.data?.announcements || [];
      setAnnouncements(list.slice(0, 3));
    } catch {}
  };

  const fetchPoliceOperations = async () => {
    if (!isPolice) return;
    try {
      const [dashRes, sosRes, patRes] = await Promise.all([
        user.role === 'STATION_HEAD' ? apiClient.get('/dashboard/station') : apiClient.get('/dashboard/officer'),
        apiClient.get('/sos'),
        apiClient.get('/patrols'),
      ]);

      if (dashRes.data?.data?.dutyStatus) {
        setOfficerDuty(dashRes.data.data.dutyStatus);
      }

      const activeSos = (sosRes.data?.data?.sosList || []).filter(
        s => s.status === 'DISPATCHED' && (s.assignedOfficerId?._id === user._id || s.assignedOfficerId === user._id)
      );
      setActiveSOSDispatches(activeSos);

      const patrols = (patRes.data?.data?.patrols || []).filter(
        p => p.status === 'ACTIVE' || p.status === 'PLANNED'
      );
      setActivePatrols(patrols);
    } catch (err) {
      console.warn('Failed to load operational data:', err.message);
    }
  };

  useEffect(() => {
    checkConnectivity();
    fetchAnnouncements();
    if (isPolice) fetchPoliceOperations();
  }, [user]);

  // Real-time high frequency officer location streaming when ON_DUTY / BUSY / RESPONDING
  useEffect(() => {
    if (!isPolice || !socket) return;

    if (['ON_DUTY', 'AVAILABLE', 'BUSY', 'RESPONDING'].includes(officerDuty)) {
      watchLocation((coords) => {
        socket.emit('officer:location:update', {
          latitude: coords.latitude,
          longitude: coords.longitude,
          dutyStatus: officerDuty,
        });

        // Also update backend REST endpoint for resilience
        apiClient.patch(`/officers/${user._id}/location`, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        }).catch(() => {});
      }).then(sub => {
        locationSubRef.current = sub;
      });
    } else {
      if (locationSubRef.current) {
        locationSubRef.current.remove?.();
        locationSubRef.current = null;
      }
    }

    return () => {
      if (locationSubRef.current) {
        locationSubRef.current.remove?.();
        locationSubRef.current = null;
      }
    };
  }, [officerDuty, isPolice, socket]);

  // Handle duty status switch
  const handleToggleDuty = async (newStatus) => {
    try {
      await apiClient.patch(`/officers/${user._id}/status`, { dutyStatus: newStatus });
      setOfficerDuty(newStatus);
      if (socket) {
        const coords = await getCurrentLocation().catch(() => null);
        if (coords) {
          socket.emit('officer:location:update', {
            latitude: coords.latitude,
            longitude: coords.longitude,
            dutyStatus: newStatus,
          });
        }
      }
    } catch (err) {
      Alert.alert('Status Error', err.message || 'Failed to update duty status');
    }
  };

  const handleArriveAtIncident = async (sosId) => {
    try {
      await apiClient.patch(`/sos/${sosId}/arrived`);
      Alert.alert('Arrival Confirmed', 'Control room and citizen notified of your arrival on scene.');
      fetchPoliceOperations();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleResolveSOSIncident = async (sosId) => {
    Alert.prompt
      ? Alert.prompt('Resolve SOS', 'Enter resolution summary:', async (summary) => {
          await apiClient.patch(`/sos/${sosId}/resolve`, { summary });
          fetchPoliceOperations();
        })
      : Alert.alert('Resolve SOS', 'Mark incident as RESOLVED?', [
          { text: 'Cancel' },
          {
            text: 'Resolve',
            onPress: async () => {
              await apiClient.patch(`/sos/${sosId}/resolve`, { summary: 'Incident resolved by responding unit.' });
              fetchPoliceOperations();
            }
          }
        ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([checkConnectivity(), fetchAnnouncements(), fetchPoliceOperations()]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const latestAnn = lastAnnouncement || (announcements.length > 0 ? announcements[0] : null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={isPolice ? '#0F172A' : '#1D4ED8'} />

      {/* Header */}
      <LinearGradient colors={isPolice ? ['#0F172A', '#1E293B'] : ['#1D4ED8', '#2563EB']} style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{user?.name || 'Officer'}</Text>
          <Text style={styles.tagline}>
            {isPolice ? `Police Unit · ${(user?.role || '').replace(/_/g, ' ')}` : 'Smart Police Station · Citizen Portal'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.connDot, { backgroundColor: isConnected ? '#34D399' : '#EF4444' }]} />
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push('/(citizen)/profile')}
          >
            <Text style={styles.avatarText}>{(user?.name || 'O')[0].toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Live Announcement Banner */}
      {latestAnn && (
        <Animated.View
          style={[
            styles.annBanner,
            getSeverityStyle(latestAnn.severity),
            { opacity: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
          ]}
        >
          <Ionicons name="megaphone" size={14} color="#fff" />
          <Text style={styles.annBannerText} numberOfLines={1}>
            {latestAnn.title}: {latestAnn.message}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(citizen)/notifications')}>
            <Text style={styles.annBannerLink}>View →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D4ED8" />}
        showsVerticalScrollIndicator={false}
      >
        {/* POLICE OPERATIONAL MODE CONTROLS */}
        {isPolice ? (
          <View style={styles.policeCard}>
            <View style={styles.policeHeaderRow}>
              <View style={styles.policeBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={styles.policeBadgeText}>FIELD OPERATIONS CONSOLE</Text>
              </View>
              <View style={[styles.dutyStatusPill, getDutyPillStyle(officerDuty)]}>
                <Text style={styles.dutyStatusPillText}>{officerDuty.replace(/_/g, ' ')}</Text>
              </View>
            </View>

            {/* Duty Status Selector */}
            <Text style={styles.dutyLabel}>Operational Duty Status (GPS Tracking Live):</Text>
            <View style={styles.dutyRow}>
              {['AVAILABLE', 'ON_DUTY', 'BUSY', 'OFF_DUTY'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.dutyBtn, officerDuty === st && styles.dutyBtnActive]}
                  onPress={() => handleToggleDuty(st)}
                >
                  <Text style={[styles.dutyBtnText, officerDuty === st && styles.dutyBtnTextActive]}>
                    {st.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Active SOS Emergency Dispatches Assigned */}
            {activeSOSDispatches.length > 0 && (
              <View style={styles.dispatchAlertCard}>
                <View style={styles.dispatchAlertHeader}>
                  <Ionicons name="warning" size={20} color="#DC2626" />
                  <Text style={styles.dispatchAlertTitle}>🚨 ACTIVE SOS DISPATCH ASSIGNED</Text>
                </View>
                {activeSOSDispatches.map((sos) => (
                  <View key={sos._id} style={styles.dispatchItem}>
                    <Text style={styles.dispatchId}>#{sos.sosId}</Text>
                    <Text style={styles.dispatchLoc}>{sos.location?.address || 'GPS Coordinates'}</Text>
                    <View style={styles.dispatchBtnRow}>
                      <TouchableOpacity
                        style={styles.arriveBtn}
                        onPress={() => handleArriveAtIncident(sos._id)}
                      >
                        <Ionicons name="location" size={14} color="#fff" />
                        <Text style={styles.arriveBtnText}>Confirm Arrival</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.resolveBtn}
                        onPress={() => handleResolveSOSIncident(sos._id)}
                      >
                        <Ionicons name="checkmark-done" size={14} color="#fff" />
                        <Text style={styles.resolveBtnText}>Resolve</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* CITIZEN MODE SOS BANNER */
          <TouchableOpacity
            style={styles.sosCard}
            onPress={() => router.push('/(citizen)/sos')}
            activeOpacity={0.9}
          >
            <View style={styles.sosCardLeft}>
              <View style={styles.sosIconCircle}>
                <Ionicons name="alert-circle" size={32} color="#DC2626" />
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text style={styles.sosCardTitle}>EMERGENCY SOS</Text>
                <Text style={styles.sosCardSub}>Tap to send GPS location to nearest police station</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Connection Status */}
        <View style={[styles.statusBox, apiStatus === 'connected' ? styles.statusSuccess : styles.statusWarning]}>
          <Ionicons
            name={apiStatus === 'connected' ? 'checkmark-circle' : 'warning'}
            size={16}
            color={apiStatus === 'connected' ? '#059669' : '#D97706'}
          />
          <Text style={[styles.statusText, { color: apiStatus === 'connected' ? '#065F46' : '#92400E' }]}>
            {apiStatus === 'connected'
              ? `Command Network Connected · Telemetry ${isConnected ? 'Online' : 'Syncing...'}`
              : 'Command Network connecting...'}
          </Text>
          {isConnected && (
            <View style={styles.liveDot}>
              <Text style={styles.liveDotText}>LIVE</Text>
            </View>
          )}
        </View>

        {/* Dashboard Grid */}
        <Text style={styles.sectionTitle}>{isPolice ? 'Police Tactical Modules' : 'Citizen Services'}</Text>
        <View style={styles.grid}>
          <DashboardTile
            icon="map"
            title="Operational Map"
            sub="GPS & Stations"
            color="#1D4ED8"
            bg="#DBEAFE"
            onPress={() => router.push('/(citizen)/map')}
          />
          <DashboardTile
            icon="document-text"
            title="Complaints"
            sub={isPolice ? "Assigned Cases" : "File & Track"}
            color="#7C3AED"
            bg="#EDE9FE"
            onPress={() => router.push('/(citizen)/complaints')}
          />
          <DashboardTile
            icon="newspaper"
            title="FIR Dossiers"
            sub="Crime Registers"
            color="#059669"
            bg="#D1FAE5"
            onPress={() => router.push('/(citizen)/firs')}
          />
          <DashboardTile
            icon="alert-circle"
            title="SOS Monitor"
            sub="Distress Beacons"
            color="#DC2626"
            bg="#FEE2E2"
            onPress={() => router.push('/(citizen)/sos')}
          />
          <DashboardTile
            icon="notifications"
            title="Alerts"
            sub="Broadcasts"
            color="#0284C7"
            bg="#E0F2FE"
            badge={unreadCount > 0 ? unreadCount : null}
            onPress={() => { setUnreadCount(0); router.push('/(citizen)/notifications'); }}
          />
          <DashboardTile
            icon="person"
            title="Profile"
            sub="Service Records"
            color="#475569"
            bg="#F1F5F9"
            onPress={() => router.push('/(citizen)/profile')}
          />
        </View>

        {/* Announcements */}
        {announcements.length > 0 && (
          <View style={styles.annCard}>
            <View style={styles.annCardHeader}>
              <Ionicons name="megaphone" size={16} color="#D97706" />
              <Text style={styles.annCardTitle}>Command Safety Broadcasts</Text>
            </View>
            {announcements.map((ann, i) => (
              <View key={ann._id || i} style={[styles.annItem, i < announcements.length - 1 && styles.annItemBorder]}>
                <View style={[styles.annSeverityDot, getSeverityDotStyle(ann.severity)]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.annTitle} numberOfLines={1}>{ann.title}</Text>
                  <Text style={styles.annMessage} numberOfLines={2}>{ann.message}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function getDutyPillStyle(duty) {
  if (duty === 'ON_DUTY' || duty === 'AVAILABLE') return { backgroundColor: '#D1FAE5' };
  if (duty === 'BUSY' || duty === 'RESPONDING') return { backgroundColor: '#FEE2E2' };
  return { backgroundColor: '#F1F5F9' };
}

function getSeverityStyle(severity) {
  const s = (severity || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH') return { backgroundColor: '#DC2626' };
  if (s === 'MEDIUM') return { backgroundColor: '#D97706' };
  return { backgroundColor: '#1D4ED8' };
}

function getSeverityDotStyle(severity) {
  const s = (severity || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH') return { backgroundColor: '#DC2626' };
  if (s === 'MEDIUM') return { backgroundColor: '#D97706' };
  return { backgroundColor: '#1D4ED8' };
}

function DashboardTile({ icon, title, sub, color, bg, onPress, badge }) {
  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: bg }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ position: 'relative' }}>
        <Ionicons name={icon} size={28} color={color} />
        {badge != null && (
          <View style={styles.tileBadge}>
            <Text style={styles.tileBadgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tileTitle, { color }]}>{title}</Text>
      <Text style={styles.tileSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  greeting: { fontSize: 13, color: '#BFDBFE' },
  name: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  tagline: { fontSize: 11, color: '#93C5FD', marginTop: 2 },
  avatarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  annBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  annBannerText: { flex: 1, fontSize: 11, fontWeight: '600', color: '#fff' },
  annBannerLink: { fontSize: 11, fontWeight: '800', color: '#fff', textDecorationLine: 'underline' },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Police Operations Card
  policeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2,
  },
  policeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  policeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  policeBadgeText: { fontSize: 11, fontWeight: '800', color: '#0F172A', letterSpacing: 0.5 },
  dutyStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  dutyStatusPillText: { fontSize: 10, fontWeight: '800', color: '#0F172A' },
  dutyLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  dutyRow: { flexDirection: 'row', gap: 6 },
  dutyBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  dutyBtnActive: { backgroundColor: '#1E293B', borderColor: '#0F172A' },
  dutyBtnText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  dutyBtnTextActive: { color: '#FFFFFF' },

  dispatchAlertCard: {
    marginTop: 14, padding: 12, backgroundColor: '#FEF2F2',
    borderRadius: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  dispatchAlertHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  dispatchAlertTitle: { fontSize: 12, fontWeight: '800', color: '#DC2626' },
  dispatchItem: { backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FEE2E2' },
  dispatchId: { fontSize: 12, fontWeight: '800', color: '#DC2626' },
  dispatchLoc: { fontSize: 11, color: '#475569', marginTop: 2, marginBottom: 8 },
  dispatchBtnRow: { flexDirection: 'row', gap: 8 },
  arriveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 7, borderRadius: 8, backgroundColor: '#2563EB',
  },
  arriveBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  resolveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 7, borderRadius: 8, backgroundColor: '#059669',
  },
  resolveBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  sosCard: {
    backgroundColor: '#DC2626',
    borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14, elevation: 6,
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  sosCardLeft: { flexDirection: 'row', alignItems: 'center' },
  sosIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
  },
  sosCardTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  sosCardSub: { fontSize: 11, color: '#FECACA', marginTop: 2, maxWidth: 200 },

  statusBox: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10,
    padding: 10, marginBottom: 16, borderWidth: 1, gap: 8,
  },
  statusSuccess: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  statusWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  statusText: { fontSize: 11, fontWeight: '600', flex: 1 },
  liveDot: { backgroundColor: '#059669', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  liveDotText: { fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  tile: {
    width: (width - 42) / 2, borderRadius: 14, padding: 14,
    alignItems: 'flex-start', elevation: 1,
  },
  tileTitle: { fontSize: 13, fontWeight: '700', marginTop: 10 },
  tileSub: { fontSize: 10, color: '#64748B', marginTop: 3 },
  tileBadge: {
    position: 'absolute', top: -6, right: -8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
  },
  tileBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  annCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    marginBottom: 14, elevation: 2, borderWidth: 1, borderColor: '#FEF3C7',
  },
  annCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  annCardTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  annItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  annItemBorder: { borderBottomWidth: 1, borderBottomColor: '#FEF9C3' },
  annSeverityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  annTitle: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  annMessage: { fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 16 },
});
