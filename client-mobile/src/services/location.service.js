import * as Location from 'expo-location';

export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    return false;
  }
};

export const getCurrentLocation = async () => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error('Location permission was denied. Please enable location permissions in settings.');
  }

  const isEnabled = await Location.hasServicesEnabledAsync();
  if (!isEnabled) {
    throw new Error('GPS/Location services are disabled on your device. Please turn on GPS.');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
};

export const reverseGeocode = async (latitude, longitude) => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results && results.length > 0) {
      const place = results[0];
      const parts = [
        place.name,
        place.street,
        place.subregion || place.district,
        place.city,
        place.region,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    }
    return `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
  } catch (err) {
    return `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
  }
};

export const geocodeSearch = async (query) => {
  if (!query || !query.trim()) return [];
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return [];

    const searchQuery = query.toLowerCase().includes('nagpur') ? query : `${query}, Nagpur, Maharashtra`;
    const results = await Location.geocodeAsync(searchQuery);

    if (!results || results.length === 0) return [];

    // Reverse geocode results to get readable addresses
    const searchResults = await Promise.all(
      results.slice(0, 5).map(async (res, idx) => {
        const addr = await reverseGeocode(res.latitude, res.longitude);
        return {
          id: `res-${idx}-${res.latitude}-${res.longitude}`,
          latitude: res.latitude,
          longitude: res.longitude,
          address: addr,
        };
      })
    );
    return searchResults;
  } catch (err) {
    return [];
  }
};

export const watchLocation = async (callback) => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;

  return await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
    },
    (loc) => {
      callback({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    }
  );
};
