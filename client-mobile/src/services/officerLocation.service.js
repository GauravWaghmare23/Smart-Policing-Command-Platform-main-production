import apiClient from './apiClient';
import * as Location from 'expo-location';

let activeLocationSubscription = null;

/**
 * Send current authenticated officer's GPS location to the server.
 */
export const updateOfficerLocation = async (latitude, longitude, isSimulated = false) => {
  try {
    const res = await apiClient.patch('/officers/me/location', {
      latitude: Number(latitude),
      longitude: Number(longitude),
      isSimulated: Boolean(isSimulated)
    });
    return res.data?.data || res.data;
  } catch (error) {
    const msg = error.response?.data?.message || error.message || 'Failed to update location';
    throw new Error(msg);
  }
};

/**
 * Start streaming live officer GPS location while on-duty.
 */
export const startOfficerLocationTracking = async (onLocationUpdate = null, onError = null) => {
  try {
    // Stop any existing tracking first
    await stopOfficerLocationTracking();

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      const err = new Error('Location permission denied. Cannot track officer position.');
      if (onError) onError(err);
      return null;
    }

    const isEnabled = await Location.hasServicesEnabledAsync();
    if (!isEnabled) {
      const err = new Error('Device GPS services are disabled. Please turn on GPS.');
      if (onError) onError(err);
      return null;
    }

    // Get immediate position and sync
    try {
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (initial?.coords) {
        await updateOfficerLocation(initial.coords.latitude, initial.coords.longitude);
        if (onLocationUpdate) {
          onLocationUpdate({
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
          });
        }
      }
    } catch (initialErr) {
      console.warn('[OFFICER_LOC] Initial location fetch warning:', initialErr.message);
    }

    // Watch position periodically
    activeLocationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Every 10 seconds
        distanceInterval: 15, // Or every 15 meters
      },
      async (location) => {
        try {
          const { latitude, longitude } = location.coords;
          await updateOfficerLocation(latitude, longitude);
          if (onLocationUpdate) {
            onLocationUpdate({ latitude, longitude });
          }
        } catch (postErr) {
          console.warn('[OFFICER_LOC] Failed to sync periodic location:', postErr.message);
          if (onError) onError(postErr);
        }
      }
    );

    return activeLocationSubscription;
  } catch (err) {
    console.error('[OFFICER_LOC] Failed to start location tracking:', err);
    if (onError) onError(err);
    return null;
  }
};

/**
 * Stop live officer GPS tracking.
 */
export const stopOfficerLocationTracking = async () => {
  if (activeLocationSubscription) {
    try {
      activeLocationSubscription.remove();
    } catch (_) {}
    activeLocationSubscription = null;
  }
};
