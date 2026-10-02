import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { getSocket } from '../../socket/socket';
import { MapPin, Layers, Navigation, Radio } from 'lucide-react';

const LIBRARIES = ['places', 'geometry', 'routes'];
const NAGPUR_CENTER = { lat: 21.1458, lng: 79.0882 };

// ─── Map style ────────────────────────────────────────────────────────────────
const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#1e293b' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bfdbfe' }] }
];

// ─── Officer status colors ────────────────────────────────────────────────────
const DUTY_COLOR = {
  BUSY: '#d97706',
  ON_DUTY: '#2563eb',
  AVAILABLE: '#16a34a',
  OFF_DUTY: '#94a3b8',
  DISPATCHED: '#dc2626',
};

// ─── Build Google Maps SVG label pin ─────────────────────────────────────────
function officerIconSvg(color, initial, size = 32) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="50%" y="${size / 2 + 1}" dominant-baseline="middle" text-anchor="middle"
        font-family="Inter,sans-serif" font-size="${size * 0.45}" font-weight="700" fill="white">${initial}</text>
      <polygon points="${size / 2 - 5},${size - 2} ${size / 2 + 5},${size - 2} ${size / 2},${size + 7}"
        fill="${color}" stroke="white" stroke-width="1"/>
    </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg.trim());
}

function sosIconSvg(size = 36) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#dc2626" stroke="white" stroke-width="3"/>
      <text x="50%" y="${size / 2 + 1}" dominant-baseline="middle" text-anchor="middle"
        font-family="Inter,sans-serif" font-size="${size * 0.38}" font-weight="900" fill="white">SOS</text>
      <polygon points="${size / 2 - 6},${size - 2} ${size / 2 + 6},${size - 2} ${size / 2},${size + 7}"
        fill="#dc2626" stroke="white" stroke-width="1"/>
    </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg.trim());
}

// ─── Main Component ───────────────────────────────────────────────────────────
const PoliceMap = ({
  stations = [],
  officers = [],
  complaints = [],
  sosList = [],
  hotspots = [],
  routeWaypoints = null,
  dispatchRoute = null,   // { officer: {lat,lng,name}, sos: {lat,lng,address} }
  height = 'h-96',
  title = 'OPERATIONAL TACTICAL MAP',
  onMarkerClick = null
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES
  });

  const mapRef           = useRef(null);
  const mapInstanceRef   = useRef(null);
  const markersRef       = useRef([]);         // static markers
  const officerMarkersRef = useRef({});        // keyed by officerId for real-time updates
  const circlesRef       = useRef([]);
  const polylineRef      = useRef(null);
  const directionsRendererRef = useRef(null);
  const dispatchRendererRef   = useRef(null);  // separate renderer for dispatch route
  const infoWindowRef    = useRef(null);
  const liveCountRef     = useRef(0);

  const [layers, setLayers] = useState({
    stations: true,
    officers: true,
    complaints: true,
    sos: true,
    hotspots: true,
    routes: true,
    dispatch: true,
  });
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [liveOfficerCount, setLiveOfficerCount] = useState(0);

  // ─── Initialize Map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: NAGPUR_CENTER,
      zoom: 12,
      styles: LIGHT_MAP_STYLE,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;
    infoWindowRef.current  = new window.google.maps.InfoWindow();
  }, [isLoaded]);

  // ─── Real-time officer:location socket handler ──────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;

    const socket = getSocket();
    if (!socket) return;

    const handleOfficerLocation = (payload) => {
      if (!mapInstanceRef.current) return;
      const { officerId, userId, name, currentLocation, dutyStatus } = payload;
      if (!currentLocation?.latitude || !currentLocation?.longitude) return;

      const key = String(officerId || userId);
      const pos = { lat: Number(currentLocation.latitude), lng: Number(currentLocation.longitude) };
      const color = DUTY_COLOR[dutyStatus] || DUTY_COLOR.ON_DUTY;
      const initial = (name || 'O')[0].toUpperCase();

      if (officerMarkersRef.current[key]) {
        // Smoothly update position
        officerMarkersRef.current[key].setPosition(pos);
        officerMarkersRef.current[key].setIcon({
          url: officerIconSvg(color, initial, 30),
          scaledSize: new window.google.maps.Size(30, 38),
          anchor: new window.google.maps.Point(15, 38),
        });
      } else {
        // Create new live officer marker
        const marker = new window.google.maps.Marker({
          position: pos,
          map: mapInstanceRef.current,
          title: `${name || 'Officer'} (LIVE)`,
          icon: {
            url: officerIconSvg(color, initial, 30),
            scaledSize: new window.google.maps.Size(30, 38),
            anchor: new window.google.maps.Point(15, 38),
          },
          zIndex: 1000,
        });

        marker.addListener('click', () => {
          infoWindowRef.current?.setContent(`
            <div style="color:#0f172a;padding:8px;font-family:Inter,sans-serif;min-width:180px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px">${initial}</div>
                <div>
                  <div style="font-weight:800;font-size:13px">👮 ${name || 'Officer'}</div>
                  <div style="font-size:10px;color:#64748b;font-weight:600">LIVE LOCATION</div>
                </div>
              </div>
              <div style="font-size:11px;color:${color};font-weight:700;padding:4px 8px;background:${color}22;border-radius:6px;display:inline-block">
                ${(dutyStatus || 'ON_DUTY').replace(/_/g, ' ')}
              </div>
              <div style="font-size:10px;color:#94a3b8;margin-top:6px">
                Last update: ${new Date().toLocaleTimeString()}
              </div>
            </div>
          `);
          infoWindowRef.current?.open(mapInstanceRef.current, marker);
        });

        officerMarkersRef.current[key] = marker;
        liveCountRef.current += 1;
        setLiveOfficerCount(liveCountRef.current);
      }
    };

    socket.on('officer:location', handleOfficerLocation);

    return () => {
      socket.off('officer:location', handleOfficerLocation);
    };
  }, [isLoaded]);

  // ─── Dispatch Route rendering ────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    // Clear previous dispatch route
    if (dispatchRendererRef.current) {
      dispatchRendererRef.current.setMap(null);
      dispatchRendererRef.current = null;
    }

    if (!dispatchRoute || !layers.dispatch) return;

    const { officer: offLoc, sos: sosLoc } = dispatchRoute;
    if (!offLoc?.lat || !sosLoc?.lat) return;

    const directionsService = new window.google.maps.DirectionsService();
    const renderer = new window.google.maps.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#dc2626',
        strokeWeight: 5,
        strokeOpacity: 0.9,
        icons: [{
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 4,
            fillColor: '#dc2626',
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#fff',
          },
          offset: '50%',
          repeat: '80px',
        }],
      },
      markerOptions: {
        visible: true,
      },
    });

    dispatchRendererRef.current = renderer;

    directionsService.route(
      {
        origin: { lat: offLoc.lat, lng: offLoc.lng },
        destination: { lat: sosLoc.lat, lng: sosLoc.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          renderer.setDirections(result);
          // Zoom to fit route
          const route = result.routes[0];
          if (route?.bounds) {
            mapInstanceRef.current.fitBounds(route.bounds);
          }
        } else {
          console.warn('[MAP] Dispatch route failed, drawing polyline fallback:', status);
          // Fallback polyline
          const polyline = new window.google.maps.Polyline({
            path: [
              { lat: offLoc.lat, lng: offLoc.lng },
              { lat: sosLoc.lat, lng: sosLoc.lng },
            ],
            geodesic: true,
            strokeColor: '#dc2626',
            strokeOpacity: 0.9,
            strokeWeight: 5,
            map: mapInstanceRef.current,
          });
          polylineRef.current = polyline;
        }
      }
    );
  }, [isLoaded, dispatchRoute, layers.dispatch]);

  // ─── Static layer re-render ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidBounds = false;

    // Clear static markers (NOT officerMarkersRef — those are live)
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    if (directionsRendererRef.current) { directionsRendererRef.current.setMap(null); directionsRendererRef.current = null; }

    // 1. STATIONS
    if (layers.stations) {
      stations.forEach((st) => {
        if (!st.location?.latitude || !st.location?.longitude) return;
        const pos = { lat: Number(st.location.latitude), lng: Number(st.location.longitude) };
        bounds.extend(pos); hasValidBounds = true;

        const marker = new window.google.maps.Marker({
          position: pos, map,
          title: st.name,
          icon: {
            path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 8,
            fillColor: '#1d4ed8', fillOpacity: 1,
            strokeWeight: 2, strokeColor: '#ffffff',
          },
          zIndex: 500,
        });
        marker.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div style="color:#0f172a;padding:8px;font-family:Inter,sans-serif;max-width:220px">
              <h4 style="margin:0 0 6px;font-weight:800;font-size:13px;color:#1d4ed8">🏢 ${st.name}</h4>
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#2563eb">Code: ${st.stationCode}</p>
              <p style="margin:0 0 4px;font-size:11px;color:#475569">${st.address || ''}</p>
              <p style="margin:0;font-size:11px;font-weight:700;color:#16a34a">Status: ${st.status}</p>
            </div>
          `);
          infoWindowRef.current.open(map, marker);
          if (onMarkerClick) onMarkerClick('station', st);
        });
        markersRef.current.push(marker);
      });
    }

    // 2. OFFICERS (static, from prop — may not have location yet)
    if (layers.officers) {
      officers.forEach((off) => {
        const loc = off.currentLocation || off.location;
        if (!loc?.latitude || !loc?.longitude) return;
        const key = String(off._id || off.userId?._id);
        // Skip if already rendered as live officer marker
        if (officerMarkersRef.current[key]) return;

        const pos = { lat: Number(loc.latitude), lng: Number(loc.longitude) };
        bounds.extend(pos); hasValidBounds = true;

        const status = off.dutyStatus || 'AVAILABLE';
        const color = DUTY_COLOR[status] || DUTY_COLOR.AVAILABLE;
        const name = off.userId?.name || 'Officer';
        const initial = name[0].toUpperCase();

        const marker = new window.google.maps.Marker({
          position: pos, map,
          title: name,
          icon: {
            url: officerIconSvg(color, initial, 30),
            scaledSize: new window.google.maps.Size(30, 38),
            anchor: new window.google.maps.Point(15, 38),
          },
          zIndex: 400,
        });
        marker.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div style="color:#0f172a;padding:8px;font-family:Inter,sans-serif;min-width:180px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:700">${initial}</div>
                <div>
                  <div style="font-weight:800;font-size:13px">👮 ${name}</div>
                  <div style="font-size:10px;color:#64748b">${off.rank || ''} · Badge ${off.badgeNumber || ''}</div>
                </div>
              </div>
              <div style="font-size:11px;color:${color};font-weight:700">${status.replace(/_/g, ' ')}</div>
            </div>
          `);
          infoWindowRef.current.open(map, marker);
          if (onMarkerClick) onMarkerClick('officer', off);
        });
        markersRef.current.push(marker);
      });
    }

    // 3. COMPLAINTS
    if (layers.complaints) {
      complaints.forEach((comp) => {
        if (!comp.location?.latitude || !comp.location?.longitude) return;
        const pos = { lat: Number(comp.location.latitude), lng: Number(comp.location.longitude) };
        bounds.extend(pos); hasValidBounds = true;

        const marker = new window.google.maps.Marker({
          position: pos, map,
          title: comp.title,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 6, fillColor: '#d97706',
            fillOpacity: 0.9, strokeWeight: 1.5, strokeColor: '#ffffff',
          },
          zIndex: 300,
        });
        marker.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div style="color:#0f172a;padding:8px;font-family:Inter,sans-serif;max-width:220px">
              <h4 style="margin:0 0 4px;font-weight:700;font-size:12px;color:#b45309">📋 ${comp.complaintId}: ${comp.title}</h4>
              <p style="margin:0 0 4px;font-size:11px">Type: <b>${comp.crimeType}</b></p>
              <p style="margin:0;font-size:11px;color:#475569">Status: ${comp.status}</p>
            </div>
          `);
          infoWindowRef.current.open(map, marker);
          if (onMarkerClick) onMarkerClick('complaint', comp);
        });
        markersRef.current.push(marker);
      });
    }

    // 4. SOS ALERTS
    if (layers.sos) {
      sosList.forEach((sos) => {
        if (!sos.location?.latitude || !sos.location?.longitude) return;
        const pos = { lat: Number(sos.location.latitude), lng: Number(sos.location.longitude) };
        bounds.extend(pos); hasValidBounds = true;

        const marker = new window.google.maps.Marker({
          position: pos, map,
          title: `EMERGENCY SOS: ${sos.sosId}`,
          animation: window.google.maps.Animation.BOUNCE,
          icon: {
            url: sosIconSvg(36),
            scaledSize: new window.google.maps.Size(36, 44),
            anchor: new window.google.maps.Point(18, 44),
          },
          zIndex: 2000,
        });
        marker.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div style="color:#0f172a;padding:8px;font-family:Inter,sans-serif;max-width:240px">
              <div style="background:#fee2e2;border-radius:8px;padding:8px;margin-bottom:8px">
                <h4 style="margin:0;font-weight:900;font-size:13px;color:#dc2626">🚨 EMERGENCY SOS</h4>
                <p style="margin:2px 0 0;font-size:10px;color:#991b1b;font-weight:600">${sos.sosId}</p>
              </div>
              <p style="margin:0 0 4px;font-size:11px">Citizen: <b>${sos.citizenId?.name || 'Anonymous'}</b></p>
              <p style="margin:0 0 4px;font-size:11px;color:#475569">${sos.location?.address || ''}</p>
              ${sos.nearestStationId ? `<p style="margin:0 0 4px;font-size:11px;color:#2563eb">Station: ${sos.nearestStationId.name}</p>` : ''}
              ${sos.assignedOfficerId ? `<p style="margin:0 0 4px;font-size:11px;color:#16a34a">Officer: ${sos.assignedOfficerId.name}</p>` : ''}
              <p style="margin:0;font-size:11px;font-weight:700;color:#dc2626">Status: ${sos.status}</p>
            </div>
          `);
          infoWindowRef.current.open(map, marker);
          if (onMarkerClick) onMarkerClick('sos', sos);
        });
        markersRef.current.push(marker);
      });
    }

    // 5. CRIME HOTSPOTS
    if (layers.hotspots) {
      hotspots.forEach((hs) => {
        if (!hs.latitude || !hs.longitude) return;
        const pos = { lat: Number(hs.latitude), lng: Number(hs.longitude) };
        bounds.extend(pos); hasValidBounds = true;

        const colorMap = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#16a34a' };
        const circleColor = colorMap[hs.severity] || '#d97706';
        const radiusMeters = hs.incidentCount ? Math.min(800, Math.max(250, hs.incidentCount * 40)) : 350;

        const circle = new window.google.maps.Circle({
          strokeColor: circleColor, strokeOpacity: 0.85, strokeWeight: 2,
          fillColor: circleColor, fillOpacity: 0.18, map, center: pos, radius: radiusMeters,
        });
        circle.addListener('click', (e) => {
          infoWindowRef.current.setPosition(e.latLng);
          infoWindowRef.current.setContent(`
            <div style="color:#0f172a;padding:8px;font-family:Inter,sans-serif;max-width:220px">
              <h4 style="margin:0 0 4px;font-weight:700;font-size:13px;color:${circleColor}">🔥 ${hs.name || 'Crime Hotspot'}</h4>
              <p style="margin:0 0 2px;font-size:11px">Severity: <b>${hs.severity}</b></p>
              <p style="margin:0 0 2px;font-size:11px">Incidents: <b>${hs.incidentCount || 0}</b> (${hs.activeIncidentCount || 0} active)</p>
            </div>
          `);
          infoWindowRef.current.open(map);
          if (onMarkerClick) onMarkerClick('hotspot', hs);
        });
        circlesRef.current.push(circle);
      });
    }

    // 6. PATROL ROUTE
    if (layers.routes && routeWaypoints && routeWaypoints.length >= 2) {
      const directionsService = new window.google.maps.DirectionsService();
      const renderer = new window.google.maps.DirectionsRenderer({
        map, suppressMarkers: false,
        polylineOptions: { strokeColor: '#2563eb', strokeWeight: 5, strokeOpacity: 0.85 },
      });
      directionsRendererRef.current = renderer;

      const origin = { lat: Number(routeWaypoints[0].latitude), lng: Number(routeWaypoints[0].longitude) };
      const destination = { lat: Number(routeWaypoints[routeWaypoints.length - 1].latitude), lng: Number(routeWaypoints[routeWaypoints.length - 1].longitude) };
      const wayps = routeWaypoints.slice(1, -1).map((wp) => ({ location: { lat: Number(wp.latitude), lng: Number(wp.longitude) }, stopover: true }));

      directionsService.route(
        { origin, destination, waypoints: wayps, travelMode: window.google.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            renderer.setDirections(result);
          } else {
            const polyline = new window.google.maps.Polyline({
              path: routeWaypoints.map((w) => ({ lat: Number(w.latitude), lng: Number(w.longitude) })),
              geodesic: true, strokeColor: '#2563eb', strokeOpacity: 0.8, strokeWeight: 4, map,
            });
            polylineRef.current = polyline;
          }
        }
      );
    }

    if (hasValidBounds && !dispatchRoute) {
      map.fitBounds(bounds);
      const listener = window.google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom() > 15) map.setZoom(15);
        window.google.maps.event.removeListener(listener);
      });
    }
  }, [isLoaded, stations, officers, complaints, sosList, hotspots, routeWaypoints, layers]);

  // ─── Fallback ────────────────────────────────────────────────────────────────
  if (!apiKey || loadError) {
    return (
      <div className={`w-full ${height} rounded-2xl border border-surface-200 bg-surface-50 p-6 flex flex-col justify-between`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">{title}</h3>
          </div>
          <span className="badge badge-amber">MAPS UNCONFIGURED</span>
        </div>
        <div className="text-center py-6">
          <p className="text-xs font-semibold text-surface-700">Google Maps API Key missing or invalid.</p>
          <p className="text-[11px] text-surface-400 mt-1">Configure VITE_GOOGLE_MAPS_API_KEY in client/.env</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs pt-4 border-t border-surface-200">
          <div className="p-2 bg-white rounded-xl border border-surface-200"><span className="text-primary-600 font-bold">{stations.length}</span> Stations</div>
          <div className="p-2 bg-white rounded-xl border border-surface-200"><span className="text-danger-600 font-bold">{sosList.length}</span> SOS</div>
          <div className="p-2 bg-white rounded-xl border border-surface-200"><span className="text-success-600 font-bold">{officers.length}</span> Officers</div>
          <div className="p-2 bg-white rounded-xl border border-surface-200"><span className="text-warning-600 font-bold">{complaints.length}</span> Complaints</div>
          <div className="p-2 bg-white rounded-xl border border-surface-200"><span className="text-orange-600 font-bold">{hotspots.length}</span> Hotspots</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${height} rounded-2xl border border-surface-200 bg-white overflow-hidden shadow-card`}>
      {/* Header bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-surface-200 shadow-sm">
        <MapPin className="h-4 w-4 text-primary-600" />
        <span className="text-xs font-bold text-surface-800 uppercase tracking-wider">{title}</span>
        {liveOfficerCount > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-100 border border-success-200 text-[10px] font-bold text-success-700">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
            {liveOfficerCount} LIVE
          </span>
        )}
        {dispatchRoute && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger-100 border border-danger-200 text-[10px] font-bold text-danger-700">
            <Navigation className="h-3 w-3" />
            DISPATCH ROUTE
          </span>
        )}
      </div>

      {/* Layer Controls */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className="flex items-center gap-1.5 bg-white/95 hover:bg-surface-50 text-surface-700 px-3 py-1.5 rounded-xl border border-surface-200 text-xs font-semibold shadow-sm transition"
        >
          <Layers className="h-4 w-4 text-primary-600" /> Layers
        </button>

        {showLayerMenu && (
          <div className="absolute right-0 mt-2 w-52 bg-white border border-surface-200 rounded-xl p-3 shadow-modal z-20 space-y-2 text-xs">
            <h4 className="font-mono text-[10px] font-bold text-surface-400 uppercase border-b border-surface-100 pb-1 mb-2">Toggle Map Layers</h4>
            {[
              { key: 'stations', label: 'Police Stations', color: 'text-primary-600' },
              { key: 'officers', label: 'Officers (Static)', color: 'text-success-600' },
              { key: 'complaints', label: 'Complaints', color: 'text-warning-600' },
              { key: 'sos', label: 'SOS Emergency', color: 'text-danger-600' },
              { key: 'hotspots', label: 'Crime Hotspots', color: 'text-orange-600' },
              { key: 'dispatch', label: 'Dispatch Route', color: 'text-red-700' },
            ].map(({ key, label, color }) => (
              <label key={key} className="flex items-center gap-2 text-surface-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })}
                  className={`rounded border-surface-300 ${color} focus:ring-0`}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-surface-200 shadow-sm hidden sm:flex items-center gap-4 text-[11px] text-surface-600 font-medium">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary-600" /> Station</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger-600 animate-pulse" /> SOS</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success-600" /> Available</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning-500" /> Busy</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Hotspot</span>
        {dispatchRoute && <span className="flex items-center gap-1.5 text-danger-600 font-bold"><Navigation className="h-3 w-3" /> Dispatch</span>}
      </div>

      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default PoliceMap;
