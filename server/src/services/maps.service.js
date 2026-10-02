import { env } from '../config/env.js';
import { calculateDistance } from '../utils/distance.js';

export const getRouteDirections = async (origin, waypoints) => {
  if (!env.googleMapsApiKey) {
    console.log('GOOGLE_MAPS_API_KEY not configured. Running maps fallback directions.');
    return getLocalRouteFallback(origin, waypoints);
  }
  
  try {
    // Call Google Directions API
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destinationStr = waypoints.length > 0 
      ? `${waypoints[waypoints.length - 1].latitude},${waypoints[waypoints.length - 1].longitude}`
      : originStr;
      
    const waypointStr = waypoints.length > 1
      ? `optimize:true|` + waypoints.slice(0, -1).map(wp => `${wp.latitude},${wp.longitude}`).join('|')
      : '';
      
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&waypoints=${waypointStr}&key=${env.googleMapsApiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || ''}`);
    }
    
    const route = data.routes[0];
    let totalDistanceKm = 0;
    let totalDurationMin = 0;
    
    route.legs.forEach(leg => {
      totalDistanceKm += leg.distance.value / 1000;
      totalDurationMin += leg.duration.value / 60;
    });
    
    return {
      distance: Number(totalDistanceKm.toFixed(2)),
      duration: Math.round(totalDurationMin),
      encodedPolyline: route.overview_polyline.points
    };
  } catch (error) {
    console.error(`Google Maps Directions failed: ${error.message}. Running fallback...`);
    return getLocalRouteFallback(origin, waypoints);
  }
};

const getLocalRouteFallback = (origin, waypoints) => {
  if (!waypoints || waypoints.length === 0) {
    return {
      distance: 0,
      duration: 0,
      encodedPolyline: ''
    };
  }
  
  let totalDistance = 0;
  let currentPoint = origin;
  
  waypoints.forEach((wp) => {
    totalDistance += calculateDistance(
      currentPoint.latitude,
      currentPoint.longitude,
      wp.latitude,
      wp.longitude
    );
    currentPoint = wp;
  });
  
  // Return back to origin for a complete patrol loop
  totalDistance += calculateDistance(
    currentPoint.latitude,
    currentPoint.longitude,
    origin.latitude,
    origin.longitude
  );
  
  // Assume 30 km/h average speed in Pune traffic
  const averageSpeedKmh = 30;
  const durationMinutes = Math.round((totalDistance / averageSpeedKmh) * 60);
  
  return {
    distance: Number(totalDistance.toFixed(2)),
    duration: durationMinutes,
    encodedPolyline: 'mock_polyline_fallback_data_points'
  };
};
