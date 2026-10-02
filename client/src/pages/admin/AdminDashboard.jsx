import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../../api/dashboard.api';
import { StatCard, StatusBadge, LoadingSpinner, ErrorState, PageHeader, SectionCard } from '../../components/common/CommonUI';
import PoliceMap from '../../components/maps/PoliceMap';
import {
  Building2, Users, FileText, Siren, FileBadge,
  TrendingUp, AlertTriangle, Clock, RefreshCw
} from 'lucide-react';
import { getSocket } from '../../socket/socket';

const AdminDashboard = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const res = await dashboardApi.getAdminDashboard();
      if (res.success && res.data) {
        setData(res.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch admin dashboard:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const socket = getSocket();
    if (socket) {
      const handleUpdate = () => fetchDashboardData();
      socket.on('sos:new', handleUpdate);
      socket.on('sos:updated', handleUpdate);
      socket.on('complaint:new', handleUpdate);
      return () => {
        socket.off('sos:new', handleUpdate);
        socket.off('sos:updated', handleUpdate);
        socket.off('complaint:new', handleUpdate);
      };
    }
  }, []);

  if (loading) return <LoadingSpinner message="Loading control room data..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchDashboardData} />;

  const activeSOS = data?.activeSOS || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Control Room Overview</h1>
          <p className="text-sm text-surface-500 mt-0.5">Real-time command and operational dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          {activeSOS > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-danger-50 border border-danger-200 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-danger-500 sos-pulse" />
              <span className="text-xs font-bold text-danger-700">{activeSOS} Active SOS</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-success-50 rounded-full border border-success-200">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse-soft" />
            <span className="text-xs font-semibold text-success-700">Live Feed</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="p-2 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition"
            title="Refresh dashboard"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Police Stations"
          value={`${data?.activeStations || 0} / ${data?.totalStations || 0}`}
          icon={Building2}
          color="blue"
          description="Active vs total stations"
        />
        <StatCard
          title="Active Officers"
          value={`${data?.activeOfficers || 0} / ${data?.totalOfficers || 0}`}
          icon={Users}
          color="green"
          description="Available for dispatch"
        />
        <StatCard
          title="Total Complaints"
          value={data?.totalComplaints || 0}
          icon={FileText}
          color="amber"
          description={`${data?.pendingComplaints || 0} pending review`}
        />
        <StatCard
          title="Active SOS Alerts"
          value={activeSOS}
          icon={Siren}
          color={activeSOS > 0 ? 'red' : 'green'}
          description={activeSOS > 0 ? 'Emergencies requiring response' : 'No active emergencies'}
        />
      </div>

      {/* ── Map + SOS Panel ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map */}
        <div className="lg:col-span-2">
          <PoliceMap
            complaints={data?.recentComplaints || []}
            sosList={data?.recentSOS || []}
            height="h-[420px]"
            title="City Tactical Map"
          />
        </div>

        {/* Active SOS Panel */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <Siren className="h-4 w-4 text-danger-500" />
              <h2 className="text-sm font-semibold text-surface-800">Emergency SOS Monitor</h2>
            </div>
            <span className={`badge ${activeSOS > 0 ? 'badge-red' : 'badge-green'}`}>
              {data?.recentSOS?.length || 0} alerts
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(!data?.recentSOS || data.recentSOS.length === 0) ? (
              <div className="py-10 text-center">
                <div className="h-10 w-10 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Siren className="h-5 w-5 text-success-500" />
                </div>
                <p className="text-sm font-medium text-surface-500">All clear</p>
                <p className="text-xs text-surface-400 mt-1">No active emergency alerts</p>
              </div>
            ) : (
              data.recentSOS.map((sos) => (
                <div
                  key={sos._id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    sos.status === 'ACTIVE'
                      ? 'bg-danger-50 border-danger-200'
                      : 'bg-surface-50 border-surface-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold font-mono text-danger-600">{sos.sosId}</span>
                    <StatusBadge status={sos.status} />
                  </div>
                  <p className="text-xs text-surface-600 truncate">
                    {sos.location?.address || `${sos.location?.latitude}, ${sos.location?.longitude}`}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-surface-400">
                    <span>{sos.citizenId?.name || 'Anonymous'}</span>
                    <span>{new Date(sos.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-5 py-3 border-t border-surface-100">
            <a
              href="/admin/sos"
              className="block text-center text-xs font-semibold text-primary-600 hover:text-primary-700 transition"
            >
              View Emergency Control →
            </a>
          </div>
        </div>
      </div>

      {/* ── Recent Complaints Table ─────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-surface-800">Recent Incident Filings</h2>
          </div>
          <a href="/admin/complaints" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
            View All →
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th>Complaint ID</th>
                <th>Title</th>
                <th>Crime Type</th>
                <th>Citizen</th>
                <th>Station</th>
                <th>Status</th>
                <th>Filed</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {(!data?.recentComplaints || data.recentComplaints.length === 0) ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-surface-400 text-sm">
                    No complaints registered yet.
                  </td>
                </tr>
              ) : (
                data.recentComplaints.map((c) => (
                  <tr key={c._id}>
                    <td className="font-mono text-xs font-bold text-primary-600">{c.complaintId}</td>
                    <td className="font-medium text-surface-900 max-w-[200px] truncate">{c.title}</td>
                    <td className="text-xs">
                      <span className="badge badge-gray">{c.crimeType?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="text-xs">{c.citizenId?.name || 'N/A'}</td>
                    <td className="text-xs text-surface-500">{c.policeStationId?.name || 'Unassigned'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="text-xs text-surface-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-surface-400 text-right flex items-center justify-end gap-1">
          <Clock className="h-3 w-3" />
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};

export default AdminDashboard;
