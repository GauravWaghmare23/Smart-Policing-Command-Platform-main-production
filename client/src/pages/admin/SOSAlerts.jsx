import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sosApi } from '../../api/sos.api';
import { officerApi } from '../../api/officer.api';
import { stationApi } from '../../api/station.api';
import { LoadingSpinner, ErrorState, StatusBadge, EmptyState } from '../../components/common/CommonUI';
import PoliceMap from '../../components/maps/PoliceMap';
import { getSocket } from '../../socket/socket';
import {
  Siren,
  ShieldAlert,
  Radio,
  UserCheck,
  MapPin,
  X,
  Navigation,
  Building2,
  RefreshCw,
  UserPlus,
  Send,
  AlertTriangle,
  CheckCircle2,
  Car,
  Clock,
  Shield,
  Search,
  Filter
} from 'lucide-react';

const DISPATCHABLE_STATUSES = ['AVAILABLE', 'ON_DUTY'];

const SOS_STAGES = [
  { key: 'ACTIVE', label: '1. Received' },
  { key: 'DISPATCHED', label: '2. Dispatched' },
  { key: 'ACKNOWLEDGED', label: '3. Acknowledged' },
  { key: 'EN_ROUTE', label: '4. En Route' },
  { key: 'ARRIVED', label: '5. On Scene' },
  { key: 'RESOLVED', label: '6. Resolved' }
];

const SOSAlerts = () => {
  const { user } = useAuth();
  const [sosList, setSosList] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedSos, setSelectedSos] = useState(null);

  // Modal States
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);

  // Form States
  const [selectedOfficerUserId, setSelectedOfficerUserId] = useState('');
  const [selectedStationFilter, setSelectedStationFilter] = useState('ALL');
  const [officerSearch, setOfficerSearch] = useState('');
  const [dispatchNote, setDispatchNote] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [resolveSummary, setResolveSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live officer location state
  const [liveOfficerLocations, setLiveOfficerLocations] = useState({});
  const liveRef = useRef({});
  const [dispatchRoute, setDispatchRoute] = useState(null);

  const isControlRoomAdmin = user?.role === 'CONTROL_ROOM_ADMIN';
  const isStationHead = user?.role === 'STATION_HEAD';

  // ── Fetch Initial Data ───────────────────────────────────────────────────────
  const fetchSOSData = async () => {
    try {
      const [sosRes, offRes, stRes] = await Promise.all([
        sosApi.getAll(),
        officerApi.getAll(),
        stationApi.getAll()
      ]);

      if (sosRes.success && sosRes.data?.sosList) {
        setSosList(sosRes.data.sosList);
        if (sosRes.data.sosList.length > 0 && !selectedSos) {
          const active = sosRes.data.sosList.find((s) => s.status !== 'RESOLVED');
          setSelectedSos(active || sosRes.data.sosList[0]);
        }
      }
      if (offRes.success && offRes.data?.officers) setOfficers(offRes.data.officers);
      if (stRes.success && stRes.data?.stations) setStations(stRes.data.stations);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load SOS monitor feed');
    } finally {
      setLoading(false);
    }
  };

  // ── Socket Events ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSOSData();
    const socket = getSocket();
    if (!socket) return;

    const handleSOSEvent = (data) => {
      fetchSOSData();
      const updated = data?.sos || data;
      if (updated?._id) {
        setSosList((prev) => prev.map((s) => (s._id === updated._id ? { ...s, ...updated } : s)));
        setSelectedSos((prev) => (prev?._id === updated._id ? { ...prev, ...updated } : prev));
      }
    };

    const handleOfficerLocation = (payload) => {
      const { officerId, userId, name, currentLocation, dutyStatus } = payload;
      if (!currentLocation?.latitude || !currentLocation?.longitude) return;
      const key = String(officerId || userId);
      const entry = {
        key,
        name: name || 'Officer',
        lat: Number(currentLocation.latitude),
        lng: Number(currentLocation.longitude),
        status: dutyStatus,
        updatedAt: new Date()
      };
      liveRef.current[key] = entry;
      setLiveOfficerLocations((prev) => ({ ...prev, [key]: entry }));
    };

    socket.on('sos:new', handleSOSEvent);
    socket.on('sos:updated', handleSOSEvent);
    socket.on('sos:acknowledged', handleSOSEvent);
    socket.on('sos:enRoute', handleSOSEvent);
    socket.on('sos:arrived', handleSOSEvent);
    socket.on('sos:escalated', handleSOSEvent);
    socket.on('sos:dispatched', (data) => {
      handleSOSEvent(data);
      const sos = data?.sos || data;
      if (sos?.location?.latitude && sos?.assignedOfficerId) {
        const offKey = String(sos.assignedOfficerId._id || sos.assignedOfficerId);
        const live = liveRef.current[offKey];
        if (live) {
          setDispatchRoute({
            officer: { lat: live.lat, lng: live.lng, name: live.name },
            sos: { lat: Number(sos.location.latitude), lng: Number(sos.location.longitude), address: sos.location.address },
            sosId: sos.sosId
          });
        }
      }
    });
    socket.on('sos:resolved', (data) => {
      handleSOSEvent(data);
      setDispatchRoute(null);
    });
    socket.on('officer:location', handleOfficerLocation);

    return () => {
      socket.off('sos:new', handleSOSEvent);
      socket.off('sos:updated', handleSOSEvent);
      socket.off('sos:acknowledged', handleSOSEvent);
      socket.off('sos:enRoute', handleSOSEvent);
      socket.off('sos:arrived', handleSOSEvent);
      socket.off('sos:dispatched', handleSOSEvent);
      socket.off('sos:escalated', handleSOSEvent);
      socket.off('sos:resolved', handleSOSEvent);
      socket.off('officer:location', handleOfficerLocation);
    };
  }, []);

  // ── Dispatch Actions ───────────────────────────────────────────────────────

  // Option A: Station Head Dispatches Themselves
  const handleDispatchMyself = async () => {
    if (!selectedSos?._id) return;
    if (!window.confirm(`Respond personally to emergency SOS ${selectedSos.sosId}? You will be assigned as lead unit.`)) return;

    setSubmitting(true);
    try {
      const res = await sosApi.dispatch(selectedSos._id, {
        isPersonalResponse: true,
        dispatchNote: 'Station Head responding personally to incident location'
      });
      if (res.success) {
        fetchSOSData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch yourself');
    } finally {
      setSubmitting(false);
    }
  };

  // Option B: Dispatch Selected Officer (Station Head or Admin)
  const handleExecuteOfficerDispatch = async (e) => {
    e.preventDefault();
    if (!selectedSos?._id || !selectedOfficerUserId) {
      alert('Please select an officer to dispatch');
      return;
    }

    setSubmitting(true);
    try {
      const res = await sosApi.dispatch(selectedSos._id, {
        officerUserId: selectedOfficerUserId,
        isPersonalResponse: false,
        dispatchNote: dispatchNote.trim()
      });
      if (res.success) {
        setDispatchModalOpen(false);
        setSelectedOfficerUserId('');
        setDispatchNote('');
        fetchSOSData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch officer');
    } finally {
      setSubmitting(false);
    }
  };

  // Response Lifecycle Handlers
  const handleAcknowledge = async (id) => {
    try {
      await sosApi.acknowledge(id);
      fetchSOSData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to acknowledge dispatch');
    }
  };

  const handleMarkEnRoute = async (id) => {
    try {
      await sosApi.markEnRoute(id);
      fetchSOSData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark en route');
    }
  };

  const handleMarkArrived = async (id) => {
    try {
      await sosApi.markArrived(id);
      fetchSOSData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm arrival');
    }
  };

  const handleExecuteEscalate = async (e) => {
    e.preventDefault();
    if (!selectedSos?._id) return;
    setSubmitting(true);
    try {
      await sosApi.escalate(selectedSos._id, escalateReason.trim() || 'Escalated by Station Head');
      setEscalateModalOpen(false);
      setEscalateReason('');
      fetchSOSData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to escalate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteResolve = async (e) => {
    e.preventDefault();
    if (!selectedSos?._id) return;
    setSubmitting(true);
    try {
      await sosApi.resolve(selectedSos._id, resolveSummary.trim() || 'Distress beacon resolved by attending officers.');
      setResolveModalOpen(false);
      setResolveSummary('');
      fetchSOSData();
      setDispatchRoute(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve SOS');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived Data & Officers Scoping ─────────────────────────────────────────
  const activeSOS = sosList.filter((s) => s.status !== 'RESOLVED');

  const currentStationHeadOfficer = isStationHead ? officers.find((o) => o.userId?._id === user?._id) : null;
  const stationHeadStationId = currentStationHeadOfficer?.stationId?._id || currentStationHeadOfficer?.stationId;

  // Station Head only gets officers from their station. Admin can filter by station or view all.
  let eligibleOfficersList = officers;
  if (isStationHead && stationHeadStationId) {
    eligibleOfficersList = officers.filter((o) => {
      const stId = o.stationId?._id || o.stationId;
      return stId && stId.toString() === stationHeadStationId.toString();
    });
  } else if (isControlRoomAdmin && selectedStationFilter !== 'ALL') {
    eligibleOfficersList = officers.filter((o) => {
      const stId = o.stationId?._id || o.stationId;
      return stId && stId.toString() === selectedStationFilter.toString();
    });
  }

  // Filter by search term
  if (officerSearch.trim()) {
    const q = officerSearch.toLowerCase();
    eligibleOfficersList = eligibleOfficersList.filter(
      (o) =>
        o.userId?.name?.toLowerCase().includes(q) ||
        o.badgeNumber?.toLowerCase().includes(q) ||
        o.rank?.toLowerCase().includes(q) ||
        o.stationId?.name?.toLowerCase().includes(q)
    );
  }

  const liveOfficerList = Object.values(liveOfficerLocations);
  const officersForMap = officers.filter((o) => {
    const loc = o.currentLocation || o.location;
    return loc?.latitude && loc?.longitude;
  });

  const getStageIndex = (status) => {
    switch (status) {
      case 'ACTIVE': return 0;
      case 'DISPATCHED': return 1;
      case 'ACKNOWLEDGED': return 2;
      case 'EN_ROUTE': return 3;
      case 'ARRIVED': return 4;
      case 'RESOLVED': return 5;
      default: return 0;
    }
  };

  if (loading) return <LoadingSpinner message="Connecting to live SOS command console..." />;
  if (error) return <ErrorState message={error} onRetry={fetchSOSData} />;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Siren className={`h-6 w-6 ${activeSOS.length > 0 ? 'text-danger-500 animate-bounce' : 'text-surface-400'}`} />
            <h1 className="text-2xl font-bold text-surface-900">
              {isStationHead ? 'Station Emergency SOS Dispatch' : 'Emergency SOS Control Room'}
            </h1>
          </div>
          <p className="text-xs text-surface-500">
            {isStationHead
              ? `Operational Command Console · ${currentStationHeadOfficer?.stationId?.name || 'Local Station Area'}`
              : 'Central Command & Multi-Station Emergency Dispatch Authority'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {liveOfficerList.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-50 border border-success-200">
              <span className="h-2 w-2 rounded-full bg-success-500 animate-pulse" />
              <span className="text-xs font-bold text-success-700">{liveOfficerList.length} Units Live GPS</span>
            </div>
          )}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${
            activeSOS.length > 0 ? 'bg-danger-50 border-danger-200 text-danger-700' : 'bg-success-50 border-success-200 text-success-700'
          }`}>
            <span className={`h-2 w-2 rounded-full ${activeSOS.length > 0 ? 'bg-danger-500 animate-pulse' : 'bg-success-500'}`} />
            <span className="text-xs font-bold">{activeSOS.length > 0 ? `${activeSOS.length} Distress Beacons Active` : 'All Clear'}</span>
          </div>
        </div>
      </div>

      {/* ── Main Panel: Telemetry & Actions + Map ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Selected SOS Telemetry Card */}
        <div className="card p-5 bg-white border border-surface-200 shadow-card flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-danger-50 rounded-xl">
                  <Siren className="h-4 w-4 text-danger-600" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-surface-400">Distress Telemetry</h2>
                  <p className="text-sm font-mono font-bold text-danger-600">{selectedSos?.sosId || 'NO ACTIVE SELECTION'}</p>
                </div>
              </div>
              {selectedSos && <StatusBadge status={selectedSos.status} />}
            </div>

            {selectedSos ? (
              <div className="space-y-3.5 text-xs pt-3">
                {/* Progression Stepper */}
                <div>
                  <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block mb-1.5">Incident Progression</span>
                  <div className="flex items-center justify-between bg-surface-50 p-2 rounded-xl border border-surface-200 overflow-x-auto">
                    {SOS_STAGES.map((st, idx) => {
                      const curIdx = getStageIndex(selectedSos.status);
                      const isComplete = idx <= curIdx && selectedSos.status !== 'ESCALATED' && selectedSos.status !== 'REJECTED';
                      const isCurrent = idx === curIdx;

                      return (
                        <div key={st.key} className="flex flex-col items-center flex-1 min-w-[50px]">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCurrent
                              ? 'bg-danger-600 text-white ring-2 ring-danger-200'
                              : isComplete
                              ? 'bg-success-600 text-white'
                              : 'bg-surface-200 text-surface-500'
                          }`}>
                            {isComplete ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[9px] mt-1 font-semibold ${isCurrent ? 'text-danger-700' : isComplete ? 'text-surface-700' : 'text-surface-400'}`}>
                            {st.label.split(' ')[1]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Citizen Details */}
                <div className="p-2.5 bg-surface-50 rounded-xl border border-surface-100 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block">Complainant / Citizen</span>
                    <p className="font-bold text-surface-900 text-xs mt-0.5">{selectedSos.citizenId?.name || 'Anonymous Citizen'}</p>
                    <p className="text-[10px] text-surface-500 font-mono">{selectedSos.citizenId?.phone || 'No phone recorded'}</p>
                  </div>
                  <span className="badge badge-blue text-[10px]">CITIZEN</span>
                </div>

                {/* Coordinates & Address */}
                <div>
                  <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block">Location Coordinates</span>
                  <p className="font-semibold text-surface-800 flex items-start gap-1.5 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-danger-500 flex-shrink-0 mt-0.5" />
                    <span>{selectedSos.location?.address || `${selectedSos.location?.latitude?.toFixed(5)}, ${selectedSos.location?.longitude?.toFixed(5)}`}</span>
                  </p>
                </div>

                {/* Stations & Assignment Telemetry */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="p-2.5 bg-primary-50/50 rounded-xl border border-primary-100">
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Nearest Station</span>
                    <p className="font-bold text-primary-900 mt-0.5 truncate">{selectedSos.nearestStationId?.name || '—'}</p>
                    <p className="text-[10px] text-primary-700 font-mono font-semibold">
                      {selectedSos.stationDistanceKm != null ? `${selectedSos.stationDistanceKm} km away` : 'Calculating...'}
                    </p>
                  </div>

                  <div className="p-2.5 bg-success-50/50 rounded-xl border border-success-100">
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Assigned Responder</span>
                    <p className="font-bold text-success-900 mt-0.5 truncate">{selectedSos.assignedOfficerId?.name || 'Unassigned'}</p>
                    <p className="text-[10px] text-success-700 font-mono font-semibold">
                      {selectedSos.officerDistanceKm != null ? `${selectedSos.officerDistanceKm} km from SOS` : 'No live ping'}
                    </p>
                  </div>
                </div>

                {/* Escalation Banner */}
                {selectedSos.status === 'ESCALATED' && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-widest block">CONTROL ROOM ESCALATION</span>
                    <p className="text-[11px] text-purple-900 mt-0.5 font-medium">
                      {selectedSos.escalationReason || 'No nearby officers available within radius. Central dispatch required.'}
                    </p>
                  </div>
                )}

                {/* Dispatch Details / Notes */}
                {selectedSos.dispatchNote && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Dispatch Note</span>
                    {selectedSos.dispatchNote}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-surface-400">Select an SOS beacon to view incident telemetry.</div>
            )}
          </div>

          {/* ── Action Buttons for Station Head & Admin ── */}
          {selectedSos && selectedSos.status !== 'RESOLVED' && (
            <div className="space-y-2 pt-3 border-t border-surface-100">
              {/* Station Head Option A: Dispatch Myself */}
              {isStationHead && selectedSos.status !== 'RESOLVED' && (
                <button
                  onClick={handleDispatchMyself}
                  disabled={submitting}
                  className="btn btn-primary w-full text-xs font-bold gap-2 justify-center bg-indigo-600 hover:bg-indigo-700 border-none shadow-sm"
                >
                  <UserPlus className="h-4 w-4" /> Dispatch Myself (Respond Personally)
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDispatchModalOpen(true)}
                  className="btn btn-primary btn-sm text-xs justify-center gap-1.5"
                >
                  <Radio className="h-3.5 w-3.5" />
                  {isStationHead ? 'Select Station Officer' : 'Dispatch Officer'}
                </button>

                <button
                  onClick={() => setEscalateModalOpen(true)}
                  className="btn btn-sm bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs justify-center gap-1"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Escalate
                </button>
              </div>

              {/* Status Update Actions for Dispatched Units */}
              {selectedSos.status === 'DISPATCHED' && (
                <button
                  onClick={() => handleAcknowledge(selectedSos._id)}
                  className="btn btn-sm w-full bg-warning-50 text-warning-800 border border-warning-200 hover:bg-warning-100 text-xs justify-center gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledge / Accept Dispatch
                </button>
              )}

              {selectedSos.status === 'ACKNOWLEDGED' && (
                <button
                  onClick={() => handleMarkEnRoute(selectedSos._id)}
                  className="btn btn-sm w-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs justify-center gap-1 font-bold"
                >
                  <Car className="h-3.5 w-3.5" /> Mark Unit En Route
                </button>
              )}

              {selectedSos.status === 'EN_ROUTE' && (
                <button
                  onClick={() => handleMarkArrived(selectedSos._id)}
                  className="btn btn-sm w-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs justify-center gap-1 font-bold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark Arrived On Scene
                </button>
              )}

              {(selectedSos.status === 'ARRIVED' || selectedSos.status === 'ACKNOWLEDGED' || selectedSos.status === 'EN_ROUTE' || selectedSos.status === 'DISPATCHED') && (
                <button
                  onClick={() => setResolveModalOpen(true)}
                  className="btn btn-sm w-full bg-success-600 text-white hover:bg-success-700 text-xs justify-center gap-1 font-bold shadow-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Resolve & Close SOS
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: GIS Map Monitor */}
        <div className="lg:col-span-2 card p-0 overflow-hidden border border-surface-200 shadow-card">
          <PoliceMap
            officers={officersForMap}
            sosList={selectedSos ? [selectedSos] : sosList}
            stations={selectedSos?.nearestStationId ? [selectedSos.nearestStationId] : stations}
            dispatchRoute={dispatchRoute}
            height="h-[480px]"
            title={
              dispatchRoute
                ? `ACTIVE ROUTE: ${dispatchRoute.officer.name} → ${dispatchRoute.sosId}`
                : selectedSos
                ? `Emergency SOS Monitor: ${selectedSos.sosId}`
                : 'Nagpur Police Emergency SOS GIS Console'
            }
          />
        </div>
      </div>

      {/* ── SOS Incident Log Table ── */}
      <div className="card overflow-hidden bg-white border border-surface-200 shadow-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 text-danger-600" />
            <h2 className="text-sm font-bold text-surface-800">SOS Distress Logs</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchSOSData} className="btn btn-ghost btn-sm text-surface-500 hover:text-surface-800">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <span className="badge badge-gray">{sosList.length} records</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th>SOS ID</th>
                <th>Complainant</th>
                <th>Location</th>
                <th>Nearest Station</th>
                <th>Assigned Unit</th>
                <th>Status</th>
                <th>Dispatched By</th>
                <th>Time</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {sosList.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12">
                    <EmptyState icon={ShieldAlert} message="No emergency SOS alerts" description="All distress alerts resolved." />
                  </td>
                </tr>
              ) : (
                sosList.map((sos) => (
                  <tr
                    key={sos._id}
                    onClick={() => {
                      setSelectedSos(sos);
                      setDispatchRoute(null);
                    }}
                    className={`cursor-pointer transition-colors ${selectedSos?._id === sos._id ? 'bg-danger-50/40' : ''}`}
                  >
                    <td><span className="text-xs font-mono font-bold text-danger-600">{sos.sosId}</span></td>
                    <td className="text-xs font-medium text-surface-900">{sos.citizenId?.name || 'Anonymous'}</td>
                    <td className="text-xs text-surface-500 max-w-[150px] truncate">
                      {sos.location?.address || `${sos.location?.latitude?.toFixed(4)}, ${sos.location?.longitude?.toFixed(4)}`}
                    </td>
                    <td className="text-xs">{sos.nearestStationId?.name || '—'}</td>
                    <td className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-surface-800">{sos.assignedOfficerId?.name || 'Unassigned'}</span>
                        {sos.isStationHeadPersonalResponse && (
                          <span className="badge badge-blue text-[9px]">SH Personal</span>
                        )}
                      </div>
                    </td>
                    <td><StatusBadge status={sos.status} /></td>
                    <td className="text-xs text-surface-500">
                      {sos.dispatchedByUserId?.name || (sos.assignedOfficerId ? 'Auto / System' : '—')}
                    </td>
                    <td className="text-xs text-surface-400 font-mono">
                      {new Date(sos.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="text-right">
                      {sos.status !== 'RESOLVED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSos(sos);
                            setDispatchModalOpen(true);
                          }}
                          className="btn btn-primary btn-sm text-[11px]"
                        >
                          Dispatch
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Officer Dispatch ── */}
      {dispatchModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-surface-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-danger-50 rounded-xl">
                  <Radio className="h-5 w-5 text-danger-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-surface-900">
                    {isStationHead ? 'Dispatch Station Officer' : 'Control Room Emergency Dispatch'}
                  </h2>
                  <p className="text-xs text-surface-400 font-mono">SOS: {selectedSos?.sosId}</p>
                </div>
              </div>
              <button onClick={() => setDispatchModalOpen(false)}><X className="h-5 w-5 text-surface-400" /></button>
            </div>

            {/* Quick Option for Station Head to self-dispatch from modal */}
            {isStationHead && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-indigo-900">Respond Personally?</p>
                  <p className="text-[11px] text-indigo-700">Dispatch yourself ({user?.name}) immediately.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDispatchModalOpen(false);
                    handleDispatchMyself();
                  }}
                  className="btn btn-primary btn-sm text-xs bg-indigo-600 hover:bg-indigo-700 border-none"
                >
                  Dispatch Myself
                </button>
              </div>
            )}

            <form onSubmit={handleExecuteOfficerDispatch} className="space-y-3.5 text-xs">
              {/* Admin Station Filter */}
              {isControlRoomAdmin && (
                <div>
                  <label className="input-label flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-surface-500" /> Filter by Police Station
                  </label>
                  <select
                    value={selectedStationFilter}
                    onChange={(e) => setSelectedStationFilter(e.target.value)}
                    className="select text-xs"
                  >
                    <option value="ALL">All Nagpur Police Stations ({stations.length} Stations)</option>
                    {stations.map((st) => (
                      <option key={st._id} value={st._id}>
                        {st.name} ({st.stationCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Officer Search Input */}
              <div>
                <label className="input-label">Search Eligible Officers</label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-surface-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={officerSearch}
                    onChange={(e) => setOfficerSearch(e.target.value)}
                    placeholder="Search by officer name, badge, rank..."
                    className="input pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Officer Selection List */}
              <div>
                <label className="input-label">Select Responding Officer *</label>
                <div className="max-h-48 overflow-y-auto border border-surface-200 rounded-xl p-2 bg-surface-50 space-y-1.5">
                  {eligibleOfficersList.length === 0 ? (
                    <p className="text-xs text-surface-400 text-center py-4">No officers found matching criteria.</p>
                  ) : (
                    eligibleOfficersList.map((off) => {
                      const isAvailable = DISPATCHABLE_STATUSES.includes(off.dutyStatus);
                      const isSelected = selectedOfficerUserId === off.userId?._id;

                      return (
                        <div
                          key={off.userId?._id}
                          onClick={() => {
                            if (isAvailable) setSelectedOfficerUserId(off.userId?._id);
                          }}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition ${
                            isSelected
                              ? 'bg-primary-50 border-primary-300 ring-2 ring-primary-100'
                              : isAvailable
                              ? 'bg-white border-surface-200 hover:border-primary-200'
                              : 'bg-surface-100 border-surface-200 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-surface-900">{off.userId?.name}</span>
                              <span className="text-[10px] font-mono text-surface-500 font-semibold">{off.badgeNumber}</span>
                            </div>
                            <p className="text-[10px] text-surface-500">
                              {off.rank} · {off.stationId?.name || 'Central'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              off.dutyStatus === 'AVAILABLE'
                                ? 'bg-success-100 text-success-700'
                                : off.dutyStatus === 'ON_DUTY'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-surface-200 text-surface-600'
                            }`}>
                              {off.dutyStatus?.replace(/_/g, ' ')}
                            </span>
                            <input
                              type="radio"
                              name="selectedOfficer"
                              checked={isSelected}
                              disabled={!isAvailable}
                              onChange={() => setSelectedOfficerUserId(off.userId?._id)}
                              className="text-primary-600"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Optional Dispatch Note */}
              <div>
                <label className="input-label">Dispatch Instructions / Note (Optional)</label>
                <input
                  type="text"
                  value={dispatchNote}
                  onChange={(e) => setDispatchNote(e.target.value)}
                  placeholder="e.g. Approach with siren, citizen near north gate"
                  className="input text-xs"
                />
              </div>

              <div className="pt-3 border-t border-surface-200 flex justify-end gap-2">
                <button type="button" onClick={() => setDispatchModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedOfficerUserId}
                  className="btn btn-danger btn-sm font-bold gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> {submitting ? 'Dispatching...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Escalate SOS ── */}
      {escalateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-surface-200">
              <h2 className="text-base font-bold text-surface-900">Escalate Distress Beacon to Control Room</h2>
              <button onClick={() => setEscalateModalOpen(false)}><X className="h-5 w-5 text-surface-400" /></button>
            </div>

            <form onSubmit={handleExecuteEscalate} className="space-y-3 text-xs">
              <p className="text-surface-600">
                Escalating will alert the Central Control Room and all surrounding police stations for cross-jurisdiction backup and tactical deployment.
              </p>
              <div>
                <label className="input-label">Reason for Escalation *</label>
                <textarea
                  required
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="e.g. Armed suspects reported / No local units available at station"
                  className="input h-20 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-surface-200 flex justify-end gap-2">
                <button type="button" onClick={() => setEscalateModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-sm bg-purple-600 text-white hover:bg-purple-700 font-bold">
                  {submitting ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Resolve SOS ── */}
      {resolveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-surface-200">
              <h2 className="text-base font-bold text-surface-900">Resolve & Close SOS Alert</h2>
              <button onClick={() => setResolveModalOpen(false)}><X className="h-5 w-5 text-surface-400" /></button>
            </div>

            <form onSubmit={handleExecuteResolve} className="space-y-3 text-xs">
              <p className="text-surface-600">
                Confirming resolution will release responding units back to AVAILABLE status and record the final closure log in the audit trail.
              </p>
              <div>
                <label className="input-label">Resolution Summary *</label>
                <textarea
                  required
                  value={resolveSummary}
                  onChange={(e) => setResolveSummary(e.target.value)}
                  placeholder="Detail the actions taken at scene and safety status of citizen..."
                  className="input h-24 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-surface-200 flex justify-end gap-2">
                <button type="button" onClick={() => setResolveModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-success btn-sm font-bold bg-success-600 hover:bg-success-700 text-white">
                  {submitting ? 'Closing...' : 'Resolve Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SOSAlerts;
