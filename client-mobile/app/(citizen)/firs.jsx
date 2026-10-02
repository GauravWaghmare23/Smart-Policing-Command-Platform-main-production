import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, StatusBar, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyFIRs } from '../../src/services/fir.service';
import { useSocket } from '../../src/context/SocketContext';
import Card from '../../src/components/Card';
import Loading from '../../src/components/Loading';
import EmptyState from '../../src/components/EmptyState';
import ErrorState from '../../src/components/ErrorState';

export default function FIRsScreen() {
  const { on, off } = useSocket();
  const [firs, setFirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchFIRs = async () => {
    try {
      setError(null);
      const data = await getMyFIRs();
      setFirs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load FIR records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFIRs();
  }, []);

  // Real-time FIR updates via Socket.IO
  useEffect(() => {
    const handleFIRUpdate = (updatedFir) => {
      if (updatedFir && updatedFir._id) {
        setFirs((prev) => prev.map((f) => (f._id === updatedFir._id ? { ...f, ...updatedFir } : f)));
        if (selected && selected._id === updatedFir._id) {
          setSelected((prev) => ({ ...prev, ...updatedFir }));
        }
      }
    };

    on('fir:updated', handleFIRUpdate);
    on('fir:statusChanged', handleFIRUpdate);

    return () => {
      off('fir:updated', handleFIRUpdate);
      off('fir:statusChanged', handleFIRUpdate);
    };
  }, [selected]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFIRs();
    setRefreshing(false);
  };

  if (loading) return <Loading message="Loading registered First Information Reports (FIRs)..." />;
  if (error) return <ErrorState message={error} onRetry={fetchFIRs} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>My Registered FIRs</Text>
        <Text style={styles.sub}>{firs.length} First Information Report(s)</Text>
      </View>

      {firs.length === 0 ? (
        <EmptyState
          icon="newspaper-outline"
          title="No Registered FIRs"
          message="FIRs registered by police stations regarding your cases will appear here."
        />
      ) : (
        <FlatList
          data={firs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D4ED8" />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.85}>
              <Card>
                <View style={styles.cardHeader}>
                  <Text style={styles.firNum}>FIR #{item.firNumber || item._id?.slice(-6)}</Text>
                  <View style={[styles.badge, getStatusStyle(item.status)]}>
                    <Text style={styles.badgeText}>{(item.status || 'REGISTERED').toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{item.title || item.subject || 'FIR Record'}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

                <View style={styles.detailList}>
                  <Text style={styles.detailText}>Station: <Text style={styles.bold}>{item.station?.name || 'Assigned Station'}</Text></Text>
                  <Text style={styles.detailText}>Officer: <Text style={styles.bold}>{item.officer?.name || 'Investigating Officer Assigned'}</Text></Text>
                  <Text style={styles.detailText}>Registered On: {new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FIR Transparency Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        {selected && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>FIR Investigation Details</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <View style={styles.modalCard}>
                <Text style={styles.firNumLarge}>FIR #{selected.firNumber || selected._id?.slice(-8)}</Text>
                <Text style={styles.detailTitle}>{selected.title || selected.subject}</Text>

                <View style={[styles.badge, getStatusStyle(selected.status), { alignSelf: 'flex-start', marginVertical: 8 }]}>
                  <Text style={styles.badgeText}>{(selected.status || 'REGISTERED').toUpperCase()}</Text>
                </View>

                {[
                  ['FIR Number', selected.firNumber || selected._id],
                  ['Crime Type', selected.crimeType || selected.category || 'General'],
                  ['Registration Date', new Date(selected.createdAt).toLocaleString()],
                  ['Police Station', selected.station?.name || 'Nagpur Police Station'],
                  ['Investigating Officer', selected.officer?.name ? `${selected.officer.name} (${selected.officer.phone || 'On Duty'})` : 'Officer Assigned'],
                  ['Investigation Status', selected.status || 'Active Investigation'],
                  ['Latest Update', selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : 'Registered'],
                ].map(([lbl, val]) => (
                  <View key={lbl} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{lbl}:</Text>
                    <Text style={styles.detailVal}>{val}</Text>
                  </View>
                ))}

                <Text style={[styles.detailLabel, { marginTop: 12 }]}>FIR Details & Sections:</Text>
                <Text style={styles.descBox}>{selected.description || 'Full First Information Report registered under relevant IPC/BNS sections.'}</Text>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

function getStatusStyle(status) {
  const s = (status || '').toLowerCase();
  if (s === 'closed' || s === 'completed') return { backgroundColor: '#D1FAE5', color: '#065F46' };
  if (s === 'investigating' || s === 'registered') return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
  return { backgroundColor: '#FEF3C7', color: '#92400E' };
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  firNum: { fontSize: 13, fontWeight: '800', color: '#7C3AED' },
  firNumLarge: { fontSize: 14, fontWeight: '800', color: '#7C3AED', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  detailList: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },
  detailText: { fontSize: 12, color: '#475569', marginBottom: 2 },
  bold: { color: '#1E293B', fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, elevation: 2 },
  detailTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  detailVal: { fontSize: 12, color: '#1E293B', fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 },
  descBox: { fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 20 },
});
