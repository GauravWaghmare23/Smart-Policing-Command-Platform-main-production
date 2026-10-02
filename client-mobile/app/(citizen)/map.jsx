import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PoliceMap from '../../src/components/PoliceMap';
import { getCurrentLocation } from '../../src/services/location.service';
import { getPoliceStations } from '../../src/services/maps.service';
import Loading from '../../src/components/Loading';
import ErrorState from '../../src/components/ErrorState';

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadMapData = async () => {
    try {
      setError(null);
      const [coords, fetchedStations] = await Promise.all([
        getCurrentLocation(),
        getPoliceStations(),
      ]);
      setLocation(coords);
      setStations(fetchedStations || []);
    } catch (err) {
      setError(err.message || 'Could not load map or location data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMapData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMapData();
    setRefreshing(false);
  };

  if (loading) {
    return <Loading message="Acquiring GPS & loading Nagpur police stations..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadMapData} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>Nagpur Police Stations Map</Text>
        <Text style={styles.sub}>{stations.length} active police station(s) loaded from backend</Text>
      </View>

      <View style={styles.mapWrapper}>
        <PoliceMap
          userLocation={location}
          stations={stations}
        />
      </View>

      {/* Legend & Refresh Overlay */}
      <View style={styles.legendCard}>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: '#1D4ED8' }]} />
          <Text style={styles.legendText}>
            My Location ({location?.latitude.toFixed(4)}, {location?.longitude.toFixed(4)})
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: '#DC2626' }]} />
          <Text style={styles.legendText}>Police Stations ({stations.length})</Text>
        </View>
        <TouchableOpacity style={styles.recenterBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={16} color="#1D4ED8" />
          <Text style={styles.recenterText}>  Refresh GPS & Stations</Text>
        </TouchableOpacity>
      </View>
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
  mapWrapper: { flex: 1 },
  legendCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendText: { fontSize: 13, color: '#1E293B', fontWeight: '500' },
  recenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  recenterText: { fontSize: 13, color: '#1D4ED8', fontWeight: '600' },
});
