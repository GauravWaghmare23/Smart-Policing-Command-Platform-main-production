import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { NAGPUR_INITIAL_REGION } from '../config/maps';

export default function PoliceMap({
  userLocation,
  stations = [],
  routePolyline = [],
  style,
}) {
  const initialRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }
    : NAGPUR_INITIAL_REGION;

  return (
    <View style={[styles.container, style]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
      >
        {/* 1. Real Citizen Location Marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="My Location"
            description="Your current GPS position"
            pinColor="#1D4ED8"
          />
        )}

        {/* 2. Real Police Stations from Backend */}
        {stations.map((st) => {
          const coords = st.location?.coordinates;
          if (!coords || coords.length < 2) return null;
          const latitude = coords[1];
          const longitude = coords[0];

          return (
            <Marker
              key={st._id || st.id || st.name}
              coordinate={{ latitude, longitude }}
              title={st.name}
              description={st.address || st.phone || 'Police Station'}
              pinColor="#DC2626"
            />
          );
        })}

        {/* 3. Optional Route Polyline provided by Backend */}
        {routePolyline && routePolyline.length > 0 && (
          <Polyline
            coordinates={routePolyline}
            strokeColor="#1D4ED8"
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
