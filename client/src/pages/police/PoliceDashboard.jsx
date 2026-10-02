import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../api/dashboard.api';
import { officerApi } from '../../api/officer.api';
import { StatCard, StatusBadge, LoadingSpinner, ErrorState, PageHeader, SectionCard } from '../../components/common/CommonUI';
import PoliceMap from '../../components/maps/PoliceMap';
import { Shield, FileText, Siren, Route, MapPin, CheckCircle, Radio, Users, ChevronRight } from 'lucide-react';
import { getSocket } from '../../socket/socket';

const PoliceDashboard = () => {
  const { user } = useAuth();
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [dutyStatus, setDutyStatus]   = useState(user?.dutyStatus || 'AVAILABLE');
  const [updatingDuty, setUpdatingDuty] = useState(false);

  const fetchDashboardData = async () => {
    try {
      let res;
      if (user.role === 'STATION_HEAD') {
        res = await dashboardApi.getStationDashboard();
      } else {
        res = await dashboardApi.getOfficerDashboard();
      }

      if (res.success && res.data) {
        setData(res.data);
        if (res.data.dutyStatus) {
          setDutyStatus(res.data.dutyStatus);
        }
      }
    } catch (err) {
      console.error('Failed to fetch police dashboard:', err);
      setError(err.response?.data?.message || err.message || 'Police console data unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const socket = getSocket();
    if (socket) {
      const handleRealtime = () => fetchDashboardData();
      socket.on('sos:new', handleRealtime);
      socket.on('sos:updated', handleRealtime);
      socket.on('complaint:new', handleRealtime);
      socket.on('complaint:updated', handleRealtime);
      socket.on('suspect:created', handleRealtime);
      socket.on('suspect:updated', handleRealtime);

      return () => {
        socket.off('sos:new', handleRealtime);
        socket.off('sos:updated', handleRealtime);
        socket.off('complaint:new', handleRealtime);
        socket.off('complaint:updated', handleRealtime);
        socket.off('suspect:created', handleRealtime);
        socket.off('suspect:updated', handleRealtime);
      };
    }
  }, [user.role]);

  const handleDutyStatusChange = async (newStatus) => {
    setUpdatingDuty(true);
    try {
      const res = await officerApi.updateStatus(user._id, newStatus);
      if (res.success) {
        setDutyStatus(newStatus);
        fetchDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update duty status');
    } finally {
      setUpdatingDuty(false);
    }
  };

  if (loading) return <LoadingSpinner message="Connecting to Operational Duty Console..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchDashboardData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome & Duty Status Controls */}
      <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900">{user?.name}</h1>
            <span className="badge badge-blue">
              {user?.role?.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-1">Operational Police Console & Real-time Duty Telemetry</p>
        </div>

        {/* Duty Toggle Button Group */}
        <div className="flex items-center gap-1.5 bg-surface-100 p-1.5 rounded-xl border border-surface-200">
          <span className="text-xs font-semibold text-surface-500 px-2 uppercase">Duty Status:</span>
          {['ON_DUTY', 'AVAILABLE', 'BUSY', 'OFF_DUTY'].map((st) => (
            <button
              key={st}
              disabled={updatingDuty}
              onClick={() => handleDutyStatusChange(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                dutyStatus === st
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-surface-600 hover:text-surface-900 hover:bg-surface-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Role View: STATION HEAD */}
      {user.role === 'STATION_HEAD' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard title="Station Complaints" value={data?.complaints?.length || 0} icon={FileText} color="amber" />
            <StatCard title="Station FIRs" value={data?.firs?.length || 0} icon={Shield} color="blue" />
            <StatCard title="Active SOS Alerts" value={data?.sos?.length || 0} icon={Siren} color="red" />
            <StatCard title="Station Officers" value={data?.officers?.length || 0} icon={CheckCircle} color="green" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card p-0 overflow-hidden">
              <PoliceMap
                complaints={data?.complaints || []}
                sosList={data?.sos || []}
                officers={data?.officers || []}
                height="h-[400px]"
                title="Station Jurisdiction Map Monitor"
              />
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-100">
                <h2 className="text-xs font-bold text-surface-700 uppercase tracking-wider">Station Officers Roster</h2>
                <span className="badge badge-gray">{data?.officers?.length || 0} Officers</span>
              </div>
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {data?.officers?.map((off) => (
                  <div key={off._id} className="p-3 rounded-xl bg-surface-50 border border-surface-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-surface-900">{off.userId?.name}</p>
                      <p className="text-[10px] text-surface-400 font-mono">{off.rank} • {off.badgeNumber}</p>
                    </div>
                    <StatusBadge status={off.dutyStatus} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role View: INVESTIGATING OFFICER */}
      {user.role === 'INVESTIGATING_OFFICER' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Assigned Complaints" value={data?.assignedComplaints?.length || 0} icon={FileText} color="amber" />
            <StatCard title="Investigating FIRs" value={data?.assignedFIRs?.length || 0} icon={Shield} color="blue" />
            <StatCard title="Active SOS Responders" value={data?.SOSAssignments?.length || 0} icon={Siren} color="red" />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-surface-100">
              <h2 className="text-xs font-bold text-surface-700 uppercase tracking-wider">My Assigned Case Files</h2>
              <span className="badge badge-blue">{data?.assignedComplaints?.length || 0} Active</span>
            </div>
            <div className="space-y-3">
              {(!data?.assignedComplaints || data.assignedComplaints.length === 0) ? (
                <p className="text-xs text-surface-400 italic py-6 text-center">No active complaints assigned to you.</p>
              ) : (
                data.assignedComplaints.map((c) => (
                  <div key={c._id} className="p-4 rounded-xl bg-surface-50 border border-surface-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary-600">{c.complaintId}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="font-semibold text-surface-900 mt-1 text-sm">{c.title}</p>
                      <p className="text-[11px] text-surface-500 mt-0.5">{c.location?.address}</p>
                    </div>
                    <a href={`/police/cases/${c._id}`} className="btn btn-primary btn-sm gap-1">
                      Open Case <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Role View: FIELD OFFICER */}
      {user.role === 'FIELD_OFFICER' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard title="Assigned SOS Emergency Alerts" value={data?.SOSAssignments?.length || 0} icon={Siren} color="red" />
            <StatCard title="Assigned Patrol Routes" value={data?.patrolAssignments?.length || 0} icon={Route} color="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card p-0 overflow-hidden">
              <PoliceMap
                sosList={data?.SOSAssignments || []}
                dispatchRoute={
                  data?.SOSAssignments && data.SOSAssignments.length > 0 && data.SOSAssignments[0].location
                    ? {
                        officer: user.currentLocation || { lat: 21.1458, lng: 79.0882, name: user.name },
                        sos: {
                          lat: Number(data.SOSAssignments[0].location.latitude),
                          lng: Number(data.SOSAssignments[0].location.longitude),
                          address: data.SOSAssignments[0].location.address
                        },
                        sosId: data.SOSAssignments[0].sosId
                      }
                    : null
                }
                height="h-[380px]"
                title="Field Officer Emergency Dispatch Route"
              />
            </div>
            <div className="card p-5 space-y-4">
              <h2 className="text-xs font-bold text-surface-700 uppercase tracking-wider border-b border-surface-100 pb-3">Active SOS Responders</h2>
              <div className="space-y-2">
                {(!data?.SOSAssignments || data.SOSAssignments.length === 0) ? (
                  <p className="text-xs text-surface-400 italic py-4 text-center">No active SOS alerts assigned.</p>
                ) : (
                  data.SOSAssignments.map((sos) => (
                    <div key={sos._id} className="p-3 rounded-xl bg-danger-50/50 border border-danger-100 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-danger-700">{sos.sosId}</span>
                        <StatusBadge status={sos.status} />
                      </div>
                      <p className="text-surface-700 truncate">{sos.location?.address}</p>
                      <div className="pt-2 flex items-center gap-1 text-[11px] font-bold text-danger-600">
                        <Route className="h-3.5 w-3.5" /> Turn-by-Turn Route Enabled on Map
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoliceDashboard;
