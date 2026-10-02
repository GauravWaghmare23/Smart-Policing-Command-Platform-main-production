import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  StatusBar,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentLocation } from '../../src/services/location.service';
import { createSOSAlert, getMySOSHistory } from '../../src/services/sos.service';
import { showLocalNotification } from '../../src/services/push.service';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';
import Loading from '../../src/components/Loading';

// ── Status timeline configuration ──────────────────────────────────
const STATUS_STEPS = [
  { key: 'PENDING',      label: 'SOS Sent',      icon: 'radio-button-on',   color: '#F59E0B' },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged',  icon: 'checkmark-circle',  color: '#3B82F6' },
  { key: 'DISPATCHED',   label: 'Dispatched',    icon: 'car-sport',         color: '#8B5CF6' },
  { key: 'RESOLVED',     label: 'Resolved',      icon: 'shield-checkmark',  color: '#10B981' },
];

const STATUS_ORDER = STATUS_STEPS.map(s => s.key);

function getStepIndex(status) {
  const s = (status || 'PENDING').toUpperCase();
  const idx = STATUS_ORDER.indexOf(s);
  if (idx >= 0) return idx;
  if (s === 'CLOSED') return 3;
  if (s === 'ESCALATED') return 2;
  return 0;
}

function getElapsed(isoDate) {
  if (!isoDate) return null;
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ── Pulsing ring animation component ───────────────────────────────
function PulseRing({ active }) {
  const scale1 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.6)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const opacity2 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!active) return;
    const pulse = (scaleVal, opacityVal, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scaleVal, { toValue: 1.6, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(opacityVal, { toValue: 0, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleVal, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacityVal, { toValue: delay === 0 ? 0.6 : 0.4, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
    const anim1 = pulse(scale1, opacity1, 0);
    const anim2 = pulse(scale2, opacity2, 600);
    anim1.start();
    anim2.start();
    return () => { anim1.stop(); anim2.stop(); };
  }, [active]);

  if (!active) return null;
  return (
    <>
      <Animated.View style={[styles.pulseRing, { transform: [{ scale: scale1 }], opacity: opacity1 }]} />
      <Animated.View style={[styles.pulseRing, { transform: [{ scale: scale2 }], opacity: opacity2 }]} />
    </>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────
export default function SOSScreen() {
  const { user } = useAuth();
  const { lastSOSUpdate } = useSocket();

  const [confirmModal, setConfirmModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sosHistory, setSosHistory] = useState([]);
  const [activeSOS, setActiveSOS] = useState(null);
  const [elapsedTick, setElapsedTick] = useState(0);

  // Tick elapsed time every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setElapsedTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchSOSData = async () => {
    try {
      const history = await getMySOSHistory();
      const list = Array.isArray(history) ? history : [];
      setSosHistory(list);
      const unresolved = list.find(
        item => item.status && !['RESOLVED', 'CLOSED'].includes((item.status || '').toUpperCase())
      );
      setActiveSOS(unresolved || null);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSOSData(); }, []);

  // Global socket SOS update from SocketContext
  useEffect(() => {
    if (!lastSOSUpdate) return;
    const sos = lastSOSUpdate;
    if (!sos._id) return;

    setSosHistory(prev =>
      prev.map(item => item._id === sos._id ? { ...item, ...sos } : item)
    );
    setActiveSOS(prev => {
      if (prev && prev._id === sos._id) return { ...prev, ...sos };
      return prev;
    });
  }, [lastSOSUpdate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSOSData();
    setRefreshing(false);
  };

  const executeSendSOS = async () => {
    setConfirmModal(false);
    setSending(true);
    try {
      const coords = await getCurrentLocation();
      const newSos = await createSOSAlert({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: `GPS (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`,
        description: `Emergency SOS triggered by citizen ${user?.name || ''}`,
      });

      setActiveSOS(newSos);
      await showLocalNotification(
        '🚨 SOS Sent',
        'Your emergency SOS has been dispatched to the nearest police station.',
        { type: 'sos' },
        'sos-alerts'
      );
      await fetchSOSData();
    } catch (err) {
      Alert.alert('SOS Failed', err.message || 'Could not send SOS. Please call 100 directly.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loading message="Loading SOS status & history..." />;

  const hasActiveSOS = !!activeSOS;
  const currentStepIdx = activeSOS ? getStepIndex(activeSOS.status) : -1;
  const isResolved = activeSOS && ['RESOLVED', 'CLOSED'].includes((activeSOS.status || '').toUpperCase());

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#991B1B" />

      {/* Header */}
      <LinearGradient colors={['#991B1B', '#DC2626']} style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="shield-half" size={22} color="#FCA5A5" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>EMERGENCY SOS</Text>
            <Text style={styles.headerSub}>{user?.name} · {user?.phone || user?.email}</Text>
          </View>
          {hasActiveSOS && (
            <View style={[styles.headerBadge, isResolved ? styles.badgeResolved : styles.badgeActive]}>
              <Ionicons name={isResolved ? 'checkmark-circle' : 'radio-button-on'} size={10} color="#fff" />
              <Text style={styles.headerBadgeText}>{isResolved ? 'RESOLVED' : 'ACTIVE'}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── SOS Button ─────────────────────────────────── */}
        <View style={styles.buttonContainer}>
          <PulseRing active={!hasActiveSOS && !sending} />
          <TouchableOpacity
            style={[styles.sosButton, (sending || (hasActiveSOS && !isResolved)) && styles.sosButtonDisabled]}
            onPress={() => setConfirmModal(true)}
            disabled={sending || (hasActiveSOS && !isResolved)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={sending ? ['#9CA3AF', '#6B7280'] : isResolved ? ['#059669', '#10B981'] : ['#B91C1C', '#EF4444']}
              style={styles.sosButtonGradient}
            >
              <Ionicons
                name={sending ? 'hourglass' : isResolved ? 'shield-checkmark' : 'alert-circle'}
                size={52}
                color="#FFFFFF"
              />
              <Text style={styles.sosButtonText}>
                {sending ? 'SENDING...' : isResolved ? 'RESOLVED' : hasActiveSOS ? 'SOS ACTIVE' : 'SEND SOS'}
              </Text>
              <Text style={styles.sosButtonSub}>
                {sending ? 'Getting your location...' : isResolved ? 'Tap to send new SOS' : hasActiveSOS ? 'Help is on the way' : 'TAP FOR EMERGENCY HELP'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Active SOS Status Timeline ──────────────────── */}
        {activeSOS && (
          <View style={styles.activeCard}>
            {/* Card Header */}
            <View style={styles.activeCardHeader}>
              <Ionicons name="pulse" size={18} color="#DC2626" />
              <Text style={styles.activeCardTitle}>Live SOS Tracking</Text>
              <View style={[styles.statusChip, getStatusChipStyle(activeSOS.status)]}>
                <Text style={styles.statusChipText}>{(activeSOS.status || 'PENDING').toUpperCase()}</Text>
              </View>
            </View>

            {/* SOS ID & Location */}
            <View style={styles.sosMetaRow}>
              <View style={styles.sosMetaItem}>
                <Text style={styles.sosMetaLabel}>SOS ID</Text>
                <Text style={styles.sosMetaValue}>#{activeSOS._id?.slice(-8)}</Text>
              </View>
              <View style={styles.sosMetaItem}>
                <Text style={styles.sosMetaLabel}>Sent</Text>
                <Text style={styles.sosMetaValue}>{getElapsed(activeSOS.createdAt)}</Text>
              </View>
              <View style={styles.sosMetaItem}>
                <Text style={styles.sosMetaLabel}>Location</Text>
                <Text style={styles.sosMetaValue} numberOfLines={1}>
                  {activeSOS.address?.split(',')[0] || `${activeSOS.latitude?.toFixed(3)}, ${activeSOS.longitude?.toFixed(3)}`}
                </Text>
              </View>
            </View>

            {/* Timeline */}
            <View style={styles.timeline}>
              {STATUS_STEPS.map((step, idx) => {
                const done = idx <= currentStepIdx;
                const active = idx === currentStepIdx;
                return (
                  <View key={step.key} style={styles.timelineRow}>
                    {/* Connector line above */}
                    {idx > 0 && (
                      <View style={[styles.timelineConnector, done && styles.timelineConnectorDone]} />
                    )}
                    <View style={[styles.timelineDot, done && { backgroundColor: step.color }, active && styles.timelineDotActive]}>
                      <Ionicons name={step.icon} size={14} color={done ? '#fff' : '#94A3B8'} />
                    </View>
                    <View style={styles.timelineLabel}>
                      <Text style={[styles.timelineStepText, done && { color: step.color, fontWeight: '700' }]}>
                        {step.label}
                      </Text>
                      {active && activeSOS.updatedAt && (
                        <Text style={styles.timelineTime}>{getElapsed(activeSOS.updatedAt)}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Nearest Station */}
            {(activeSOS.station?.name || activeSOS.assignedStationName) && (
              <View style={styles.stationCard}>
                <Ionicons name="business" size={16} color="#1D4ED8" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.stationLabel}>Nearest Police Station</Text>
                  <Text style={styles.stationName}>
                    {activeSOS.station?.name || activeSOS.assignedStationName}
                  </Text>
                </View>
                <Ionicons name="navigate" size={14} color="#1D4ED8" />
              </View>
            )}

            {/* Assigned Officer */}
            {(activeSOS.officer?.name || activeSOS.officerName) && (
              <View style={styles.officerCard}>
                <View style={styles.officerAvatar}>
                  <Ionicons name="person" size={18} color="#059669" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.officerLabel}>Assigned Officer</Text>
                  <Text style={styles.officerName}>{activeSOS.officer?.name || activeSOS.officerName}</Text>
                  {(activeSOS.officer?.phone) && (
                    <Text style={styles.officerPhone}>{activeSOS.officer.phone}</Text>
                  )}
                </View>
                <View style={styles.onDutyBadge}>
                  <Text style={styles.onDutyText}>ON DUTY</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Emergency Tips ─────────────────────────────── */}
        {!hasActiveSOS && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>📌 Emergency Tips</Text>
            <Text style={styles.tipItem}>• Stay calm and in a safe location if possible</Text>
            <Text style={styles.tipItem}>• Your GPS location is sent automatically</Text>
            <Text style={styles.tipItem}>• For voice emergency, call <Text style={{ fontWeight: '800', color: '#DC2626' }}>100</Text></Text>
            <Text style={styles.tipItem}>• SOS is tracked in real-time until resolved</Text>
          </View>
        )}

        {/* ── History ────────────────────────────────────── */}
        {sosHistory.length > 0 && (
          <>
            <Text style={styles.historyTitle}>SOS History</Text>
            {sosHistory.map((item) => (
              <View key={item._id} style={styles.historyItem}>
                <View style={[styles.historyDot, getStatusChipStyle(item.status)]} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.historyId}>#{item._id?.slice(-8)}</Text>
                  <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                  <Text style={styles.historyLoc} numberOfLines={1}>
                    {item.address || `${item.latitude}, ${item.longitude}`}
                  </Text>
                </View>
                <View style={[styles.historyBadge, getStatusChipStyle(item.status)]}>
                  <Text style={styles.historyBadgeText}>{(item.status || 'PENDING').slice(0, 8).toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Confirmation Modal ──────────────────────────── */}
      <Modal visible={confirmModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <LinearGradient colors={['#FEE2E2', '#FFF']} style={styles.modalIconBg}>
              <Ionicons name="warning" size={40} color="#DC2626" />
            </LinearGradient>
            <Text style={styles.modalTitle}>Confirm Emergency SOS</Text>
            <Text style={styles.modalBody}>
              Your real GPS location will be sent immediately to the nearest Nagpur police station. Only use in genuine emergencies.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setConfirmModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSend]}
                onPress={executeSendSOS}
              >
                <Ionicons name="alert-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.modalBtnSendText}>SEND SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getStatusChipStyle(status) {
  const s = (status || '').toUpperCase();
  if (s === 'RESOLVED' || s === 'CLOSED') return { backgroundColor: '#D1FAE5' };
  if (s === 'DISPATCHED') return { backgroundColor: '#EDE9FE' };
  if (s === 'ACKNOWLEDGED') return { backgroundColor: '#DBEAFE' };
  if (s === 'ESCALATED') return { backgroundColor: '#FEE2E2' };
  return { backgroundColor: '#FEF3C7' };
}

const BUTTON_SIZE = 180;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5 },
  headerSub: { fontSize: 11, color: '#FCA5A5', marginTop: 1 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeResolved: { backgroundColor: 'rgba(16,185,129,0.4)' },
  headerBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  scroll: { paddingHorizontal: 16, paddingTop: 24, alignItems: 'center' },

  // SOS Button
  buttonContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 24, width: BUTTON_SIZE + 80, height: BUTTON_SIZE + 80 },
  pulseRing: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#DC2626',
  },
  sosButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  sosButtonDisabled: { elevation: 4, shadowOpacity: 0.2 },
  sosButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  sosButtonText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5 },
  sosButtonSub: { fontSize: 9, color: 'rgba(255,255,255,0.75)', fontWeight: '700', textAlign: 'center', paddingHorizontal: 16 },

  // Active SOS Card
  activeCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  activeCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  activeCardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#1E293B' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusChipText: { fontSize: 10, fontWeight: '800', color: '#1E293B' },

  sosMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10 },
  sosMetaItem: { flex: 1, alignItems: 'center' },
  sosMetaLabel: { fontSize: 9, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  sosMetaValue: { fontSize: 12, fontWeight: '700', color: '#1E293B', marginTop: 2 },

  // Timeline
  timeline: { paddingLeft: 8, marginBottom: 14 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  timelineConnector: { position: 'absolute', left: 14, top: -10, width: 2, height: 12, backgroundColor: '#E2E8F0' },
  timelineConnectorDone: { backgroundColor: '#10B981' },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  timelineDotActive: { elevation: 4, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  timelineLabel: { flex: 1, paddingTop: 4, paddingBottom: 10 },
  timelineStepText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  timelineTime: { fontSize: 10, color: '#64748B', marginTop: 1 },

  // Station
  stationCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: '#BFDBFE',
  },
  stationLabel: { fontSize: 9, fontWeight: '600', color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: 0.5 },
  stationName: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 1 },

  // Officer
  officerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  officerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center',
  },
  officerLabel: { fontSize: 9, fontWeight: '600', color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 },
  officerName: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 1 },
  officerPhone: { fontSize: 11, color: '#64748B', marginTop: 1 },
  onDutyBadge: { backgroundColor: '#059669', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  onDutyText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  // Tips
  tipsCard: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 16, elevation: 1, borderWidth: 1, borderColor: '#E2E8F0',
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 10 },
  tipItem: { fontSize: 12, color: '#64748B', marginBottom: 5, lineHeight: 18 },

  // History
  historyTitle: { alignSelf: 'flex-start', fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  historyItem: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    marginBottom: 8, elevation: 1,
  },
  historyDot: { width: 10, height: 10, borderRadius: 5 },
  historyId: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  historyDate: { fontSize: 10, color: '#64748B', marginTop: 2 },
  historyLoc: { fontSize: 10, color: '#94A3B8', marginTop: 1 },
  historyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  historyBadgeText: { fontSize: 9, fontWeight: '800', color: '#1E293B' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', elevation: 20 },
  modalIconBg: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', textAlign: 'center', marginBottom: 8 },
  modalBody: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: '#F1F5F9' },
  modalBtnCancelText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  modalBtnSend: { backgroundColor: '#DC2626', elevation: 4, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  modalBtnSendText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
});
