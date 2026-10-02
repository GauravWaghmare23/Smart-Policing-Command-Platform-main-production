import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { getMyComplaints, createComplaint } from '../../src/services/complaint.service';
import { getCurrentLocation, reverseGeocode, geocodeSearch } from '../../src/services/location.service';
import { useSocket } from '../../src/context/SocketContext';
import Card from '../../src/components/Card';
import Loading from '../../src/components/Loading';
import EmptyState from '../../src/components/EmptyState';
import ErrorState from '../../src/components/ErrorState';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';

// Backend CRIME_TYPES enum mapping
const CRIME_TYPE_OPTIONS = [
  { label: 'Theft', value: 'THEFT' },
  { label: 'Assault', value: 'ASSAULT' },
  { label: 'Fraud', value: 'FRAUD' },
  { label: 'Cyber Crime', value: 'CYBER_CRIME' },
  { label: 'Harassment', value: 'HARASSMENT' },
  { label: 'Missing Person', value: 'MISSING_PERSON' },
  { label: 'Vandalism', value: 'VANDALISM' },
  { label: 'Traffic', value: 'TRAFFIC' },
  { label: 'Other', value: 'OTHER' },
];

export default function ComplaintsScreen() {
  const { on, off } = useSocket();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Success Feedback Modal State
  const [submittedComplaint, setSubmittedComplaint] = useState(null);

  // Form State
  const [form, setForm] = useState({ title: '', description: '', crimeType: 'THEFT' });
  const [formErrors, setFormErrors] = useState({});

  // Location State
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    address: '',
  });

  // Location Search & Map Picker Modal State
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [gettingCurrentLoc, setGettingCurrentLoc] = useState(false);
  const [tempLocation, setTempLocation] = useState({
    latitude: 21.1458, // Default Nagpur
    longitude: 79.0882,
    address: 'Sitabuldi, Nagpur, Maharashtra',
  });

  const fetchComplaints = async () => {
    try {
      setError(null);
      const data = await getMyComplaints();
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Socket.IO real-time updates
  useEffect(() => {
    const handleUpdate = (updated) => {
      if (updated && updated._id) {
        setComplaints((prev) =>
          prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c))
        );
        if (selected && selected._id === updated._id) {
          setSelected((prev) => ({ ...prev, ...updated }));
        }
      }
    };

    on('complaint:updated', handleUpdate);
    on('complaint:statusChanged', handleUpdate);

    return () => {
      off('complaint:updated', handleUpdate);
      off('complaint:statusChanged', handleUpdate);
    };
  }, [selected]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComplaints();
    setRefreshing(false);
  };

  // Location Picker Helpers
  const handleUseCurrentLocation = async () => {
    setGettingCurrentLoc(true);
    try {
      const coords = await getCurrentLocation();
      const addr = await reverseGeocode(coords.latitude, coords.longitude);
      setTempLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: addr,
      });
    } catch (err) {
      Alert.alert('GPS Error', err.message || 'Could not fetch current GPS location.');
    } finally {
      setGettingCurrentLoc(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await geocodeSearch(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) {
        Alert.alert('No Results', 'No matching locations found in Nagpur. Try a different query.');
      }
    } catch (err) {
      Alert.alert('Search Failed', 'Could not complete location search.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item) => {
    setTempLocation({
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.address,
    });
  };

  const confirmLocationSelection = () => {
    if (!tempLocation.latitude || !tempLocation.longitude || !tempLocation.address) {
      Alert.alert('Location Selection', 'Please select a location on the map or from search.');
      return;
    }
    setLocation({
      latitude: tempLocation.latitude,
      longitude: tempLocation.longitude,
      address: tempLocation.address,
    });
    setShowLocationPicker(false);
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Complaint title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.crimeType) errs.crimeType = 'Crime category is required';

    if (!location.latitude || !location.longitude || !location.address) {
      errs.location = 'Please select the incident location on the map.';
      Alert.alert('Incident Location Required', 'Please select the incident location on the map before submitting.');
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        crimeType: form.crimeType,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      };

      const newComplaint = await createComplaint(payload);

      setShowForm(false);
      setForm({ title: '', description: '', crimeType: 'THEFT' });
      setLocation({ latitude: null, longitude: null, address: '' });

      setSubmittedComplaint(newComplaint);
      await fetchComplaints();
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Could not submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading message="Loading your complaints..." />;
  if (error) return <ErrorState message={error} onRetry={fetchComplaints} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Complaints</Text>
          <Text style={styles.sub}>{complaints.length} complaint(s) registered</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {complaints.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No Complaints Registered"
          message="File a complaint to get assistance from the nearest police station."
        />
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D4ED8" />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.85}>
              <Card>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title || item.subject || 'Complaint'}</Text>
                  <View style={[styles.badge, getStatusBadgeStyle(item.status)]}>
                    <Text style={styles.badgeText}>{(item.status || 'SUBMITTED').toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

                <View style={styles.metaGrid}>
                  <Text style={styles.metaText}>ID: #{item._id?.slice(-8)}</Text>
                  <Text style={styles.metaText}>Category: {item.crimeType || 'THEFT'}</Text>
                </View>

                <View style={styles.transparencyRow}>
                  <Text style={styles.transparencyText} numberOfLines={1}>
                    Location: <Text style={styles.bold}>{item.address || 'Nagpur'}</Text>
                  </Text>
                  <Text style={styles.transparencyText}>
                    Station: <Text style={styles.bold}>{item.policeStationId?.name || item.station?.name || item.assignedStationName || 'Calculated by Backend'}</Text>
                  </Text>
                  {item.assignedOfficerId && (
                    <Text style={styles.transparencyText}>
                      Officer: <Text style={styles.bold}>{item.assignedOfficerId.name || item.officer?.name}</Text>
                    </Text>
                  )}
                  {item.firId && (
                    <Text style={styles.firText}>
                      FIR Registered: #{item.firId.firNumber || item.firId}
                    </Text>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {/* File Complaint Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>File New Complaint</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Input
              label="Complaint Title *"
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              placeholder="e.g. Mobile Phone Stolen at Market"
              error={formErrors.title}
            />

            <Text style={styles.fieldLabel}>Crime Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CRIME_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, form.crimeType === opt.value && styles.chipActive]}
                  onPress={() => setForm((f) => ({ ...f, crimeType: opt.value }))}
                >
                  <Text style={[styles.chipText, form.crimeType === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label="Detailed Description *"
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="Describe what happened in detail..."
              multiline
              numberOfLines={4}
              error={formErrors.description}
            />

            {/* Incident Location Picker Selector */}
            <Text style={styles.fieldLabel}>Incident Location *</Text>
            <TouchableOpacity
              style={[styles.locationCard, formErrors.location && styles.locationCardError]}
              onPress={() => {
                setTempLocation(
                  location.latitude ? location : { latitude: 21.1458, longitude: 79.0882, address: 'Sitabuldi, Nagpur, Maharashtra' }
                );
                setShowLocationPicker(true);
              }}
            >
              <Ionicons name="location" size={24} color={location.address ? '#1D4ED8' : '#94A3B8'} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.locationTitle}>
                  {location.address ? 'Selected Incident Location' : 'Tap to Select Incident Location'}
                </Text>
                <Text style={styles.locationSub} numberOfLines={2}>
                  {location.address || 'Search place or use current GPS location'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </TouchableOpacity>
            {formErrors.location && <Text style={styles.errorText}>{formErrors.location}</Text>}

            <Button
              title="SUBMIT COMPLAINT"
              onPress={handleSubmit}
              loading={submitting}
              size="lg"
              style={{ marginTop: 24, marginBottom: 40 }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Location Search & Map Picker Modal */}
      <Modal visible={showLocationPicker} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Incident Location</Text>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
            <View style={styles.searchRow}>
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search place (e.g. Sitabuldi Market Nagpur)"
                style={{ flex: 1, marginBottom: 0 }}
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={isSearching}>
                {isSearching ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="search" size={20} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.gpsBtn} onPress={handleUseCurrentLocation} disabled={gettingCurrentLoc}>
              {gettingCurrentLoc ? (
                <ActivityIndicator color="#1D4ED8" size="small" />
              ) : (
                <>
                  <Ionicons name="navigate" size={18} color="#1D4ED8" />
                  <Text style={styles.gpsBtnText}>  Use My Current GPS Location</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <View style={styles.resultsBox}>
                {searchResults.map((res) => (
                  <TouchableOpacity key={res.id} style={styles.resultRow} onPress={() => selectSearchResult(res)}>
                    <Ionicons name="location-outline" size={18} color="#1D4ED8" />
                    <Text style={styles.resultText} numberOfLines={2}>{res.address}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Interactive Map Preview */}
          <View style={{ flex: 1 }}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1 }}
              region={{
                latitude: tempLocation.latitude || 21.1458,
                longitude: tempLocation.longitude || 79.0882,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              onPress={async (e) => {
                const coords = e.nativeEvent.coordinate;
                const addr = await reverseGeocode(coords.latitude, coords.longitude);
                setTempLocation({
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  address: addr,
                });
              }}
            >
              {tempLocation.latitude && tempLocation.longitude && (
                <Marker
                  coordinate={{ latitude: tempLocation.latitude, longitude: tempLocation.longitude }}
                  title="Incident Location"
                  description={tempLocation.address}
                  pinColor="#DC2626"
                />
              )}
            </MapView>

            <View style={styles.mapConfirmBar}>
              <Text style={styles.confirmAddrText} numberOfLines={2}>
                📍 {tempLocation.address}
              </Text>
              <Button title="CONFIRM LOCATION" onPress={confirmLocationSelection} size="md" style={{ marginTop: 8 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Feedback Modal */}
      <Modal visible={!!submittedComplaint} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={56} color="#059669" />
            <Text style={styles.successTitle}>Complaint Submitted Successfully</Text>
            <Text style={styles.successId}>Complaint ID: #{submittedComplaint?._id}</Text>

            <View style={styles.successDetailBox}>
              <Text style={styles.successDetailText}>
                Status: <Text style={styles.bold}>SUBMITTED</Text>
              </Text>
              <Text style={styles.successDetailText}>
                Category: <Text style={styles.bold}>{submittedComplaint?.crimeType}</Text>
              </Text>
              <Text style={styles.successDetailText} numberOfLines={2}>
                Location: <Text style={styles.bold}>{submittedComplaint?.address}</Text>
              </Text>
              {submittedComplaint?.policeStationId?.name && (
                <Text style={styles.successDetailText}>
                  Assigned Station: <Text style={[styles.bold, { color: '#1D4ED8' }]}>{submittedComplaint.policeStationId.name}</Text>
                </Text>
              )}
            </View>

            <Button
              title="VIEW MY COMPLAINTS"
              onPress={() => setSubmittedComplaint(null)}
              size="lg"
              style={{ width: '100%', marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      {/* Detail Transparency Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        {selected && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complaint Transparency Details</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>{selected.title || selected.subject}</Text>
                <View style={[styles.badge, getStatusBadgeStyle(selected.status), { alignSelf: 'flex-start', marginVertical: 8 }]}>
                  <Text style={styles.badgeText}>{(selected.status || 'SUBMITTED').toUpperCase()}</Text>
                </View>

                {[
                  ['Complaint ID', selected.complaintId || selected._id],
                  ['Crime Category', selected.crimeType || selected.category],
                  ['Incident Address', selected.address || selected.location?.address],
                  ['Submitted Date', new Date(selected.createdAt).toLocaleString()],
                  ['Priority Level', selected.priority || 'MEDIUM'],
                  ['Jurisdiction Station', selected.policeStationId?.name || selected.station?.name || 'Calculated by Backend'],
                  ['Assigned Officer', selected.assignedOfficerId?.name ? `${selected.assignedOfficerId.name} ${selected.assignedOfficerId.rank ? `(${selected.assignedOfficerId.rank})` : ''}` : 'Officer Assignment Pending'],
                  ['Station Helpline', selected.policeStationId?.phone || '100 / 112 Emergency'],
                  ['FIR Status', selected.firId ? `Registered (#${selected.firId.firNumber || selected.firId})` : 'Under Preliminary Assessment'],
                  ['Latest Status Update', selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : 'Registered'],
                ].map(([label, val]) => (
                  <View key={label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{label}:</Text>
                    <Text style={styles.detailVal}>{val}</Text>
                  </View>
                ))}

                <Text style={[styles.detailLabel, { marginTop: 12 }]}>Description:</Text>
                <Text style={styles.descBox}>{selected.description}</Text>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

function getStatusBadgeStyle(status) {
  const s = (status || '').toLowerCase();
  if (s === 'resolved' || s === 'closed') return { backgroundColor: '#D1FAE5', color: '#065F46' };
  if (s === 'in_progress' || s === 'under_review' || s === 'assigned') return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  sub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1D4ED8', justifyContent: 'center', alignItems: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', flex: 1 },
  cardDesc: { fontSize: 13, color: '#64748B', marginVertical: 8 },
  metaGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },
  metaText: { fontSize: 11, color: '#94A3B8' },
  transparencyRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  transparencyText: { fontSize: 12, color: '#475569', marginBottom: 2 },
  bold: { color: '#1E293B', fontWeight: '600' },
  firText: { fontSize: 12, color: '#059669', fontWeight: '700', marginTop: 2 },
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
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipActive: { backgroundColor: '#EFF6FF', borderColor: '#1D4ED8' },
  chipText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  chipTextActive: { color: '#1D4ED8' },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: 8,
  },
  locationCardError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  locationTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  locationSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  errorText: { color: '#DC2626', fontSize: 12, marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#1D4ED8', justifyContent: 'center', alignItems: 'center' },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginTop: 8, backgroundColor: '#EFF6FF', borderRadius: 8 },
  gpsBtnText: { color: '#1D4ED8', fontWeight: '700', fontSize: 13 },
  resultsBox: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 8, maxHeight: 150 },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  resultText: { fontSize: 12, color: '#1E293B', marginLeft: 8, flex: 1 },
  mapConfirmBar: { padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  confirmAddrText: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', width: '100%' },
  successTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginTop: 12 },
  successId: { fontSize: 13, fontWeight: '700', color: '#1D4ED8', marginTop: 4 },
  successDetailBox: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginVertical: 14 },
  successDetailText: { fontSize: 13, color: '#475569', marginBottom: 4 },
  detailCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, elevation: 2 },
  detailTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  detailVal: { fontSize: 12, color: '#1E293B', fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 },
  descBox: { fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 20 },
});
