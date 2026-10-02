import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { acknowledgeSOS, rejectSOS } from '../services/sos.service';
import { useSocket } from '../context/SocketContext';

export default function OfficerSOSNotification({ currentUserId }) {
  const socket = useSocket();
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleDispatched = (data) => {
      const sos = data?.sos || data;
      const targetOfficerId = sos?.assignedOfficerId?._id || sos?.assignedOfficerId;
      if (String(targetOfficerId) === String(currentUserId)) {
        setActiveDispatch(sos);
      }
    };

    const handleUpdated = (data) => {
      const sos = data?.sos || data;
      if (activeDispatch && String(sos?._id) === String(activeDispatch?._id)) {
        if (sos.status === 'RESOLVED' || sos.status === 'ESCALATED') {
          setActiveDispatch(null);
        }
      }
    };

    socket.on('sos:dispatched', handleDispatched);
    socket.on('sos:updated', handleUpdated);

    return () => {
      socket.off('sos:dispatched', handleDispatched);
      socket.off('sos:updated', handleUpdated);
    };
  }, [socket, currentUserId, activeDispatch]);

  const handleAcknowledge = async () => {
    if (!activeDispatch?._id) return;
    setLoading(true);
    try {
      await acknowledgeSOS(activeDispatch._id);
      Alert.alert('Acknowledged', 'Emergency dispatch acknowledged. Proceed to scene immediately.');
      setActiveDispatch(null);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to acknowledge dispatch');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!activeDispatch?._id) return;
    Alert.alert(
      'Decline Dispatch',
      'Are you sure you cannot respond? System will immediately re-dispatch to the next nearest officer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await rejectSOS(activeDispatch._id, 'Officer unavailable in mobile app');
              setActiveDispatch(null);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to decline');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!activeDispatch) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={!!activeDispatch}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="alert-circle" size={32} color="#DC2626" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>EMERGENCY SOS DISPATCH</Text>
              <Text style={styles.sosId}>Incident #{activeDispatch.sosId}</Text>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.row}>
              <Ionicons name="location-sharp" size={18} color="#DC2626" />
              <Text style={styles.locationText} numberOfLines={2}>
                {activeDispatch.location?.address || `${activeDispatch.location?.latitude?.toFixed(4)}, ${activeDispatch.location?.longitude?.toFixed(4)}`}
              </Text>
            </View>

            {activeDispatch.officerDistanceKm != null && (
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate-circle" size={14} color="#1D4ED8" />
                <Text style={styles.distanceText}>
                  Approx. {activeDispatch.officerDistanceKm} km from your live position
                </Text>
              </View>
            )}

            <Text style={styles.notice}>
              Please acknowledge within 60 seconds or dispatch will automatically escalate.
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#DC2626" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.rejectBtn]}
                onPress={handleReject}
              >
                <Text style={styles.rejectText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.ackBtn]}
                onPress={handleAcknowledge}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.ackText}>ACKNOWLEDGE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16,
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '800', color: '#DC2626' },
  sosId: { fontSize: 13, fontWeight: '600', color: '#64748B', marginTop: 2 },
  body: { marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  locationText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B', lineHeight: 20 },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  distanceText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  notice: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 12 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  rejectBtn: { backgroundColor: '#F1F5F9' },
  rejectText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  ackBtn: { backgroundColor: '#DC2626' },
  ackText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
