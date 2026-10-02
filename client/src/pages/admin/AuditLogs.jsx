import React, { useState, useEffect } from 'react';
import { auditLogApi } from '../../api/caseRecord.api';
import { LoadingSpinner, ErrorState, PageHeader, EmptyState } from '../../components/common/CommonUI';
import { Shield, Eye, Lock, RefreshCw, Filter, Search, Calendar, UserCheck } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditLogApi.getLogs({
        search,
        resourceType: resourceFilter,
        action: actionFilter,
        userRole: roleFilter
      });
      if (res.success && res.data?.logs) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load immutable system access audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [resourceFilter, actionFilter, roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  if (loading) return <LoadingSpinner message="Retrieving Immutable Security & Operational Audit Log Stream..." />;
  if (error) return <ErrorState message={error} onRetry={fetchLogs} />;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Immutable Operational Audit Trail"
        subtitle="Complete record of all actions across Complaints, FIRs, Evidence, Suspects, SOS, Patrols & Personnel Files"
        icon={Shield}
        action={
          <button onClick={fetchLogs} className="btn btn-secondary btn-sm gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh Audit Trail
          </button>
        }
      />

      {/* Multi-criteria Filter Bar */}
      <div className="card p-4 bg-white border border-surface-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-surface-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by User Name, Action, Resource ID, or Description..."
              className="input pl-9 text-xs"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-surface-400" />
            <select value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)} className="select text-xs">
              <option value="">All Resource Types</option>
              <option value="Complaint">Complaint</option>
              <option value="FIR">FIR</option>
              <option value="Suspect">Suspect</option>
              <option value="Evidence">Evidence</option>
              <option value="SOS">SOS Emergency</option>
              <option value="Patrol">Patrol Route</option>
              <option value="User">User / Officer</option>
              <option value="Dossier">Dossier Graph</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-surface-400" />
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="select text-xs">
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="VIEW">VIEW</option>
              <option value="UPDATE">UPDATE</option>
              <option value="ASSIGN">ASSIGN</option>
              <option value="DISPATCH">DISPATCH</option>
              <option value="ACKNOWLEDGE">ACKNOWLEDGE</option>
              <option value="RESOLVE">RESOLVE</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-surface-400" />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="select text-xs">
              <option value="">All Roles</option>
              <option value="CONTROL_ROOM_ADMIN">Control Room Admin</option>
              <option value="STATION_HEAD">Station Head</option>
              <option value="INVESTIGATING_OFFICER">Investigating Officer</option>
              <option value="FIELD_OFFICER">Field Officer</option>
              <option value="CITIZEN">Citizen</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card overflow-hidden bg-white border border-surface-200 shadow-card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th>Timestamp</th>
                <th>Operator Name & Role</th>
                <th>Action</th>
                <th>Target Resource</th>
                <th>Station Scope</th>
                <th>Description & Changes</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12">
                    <EmptyState icon={Lock} message="No audit entries match filter criteria" description="All operational actions write immutable audit records automatically." />
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-surface-50">
                    <td className="text-xs font-mono text-surface-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div>
                        <p className="text-xs font-bold text-surface-900">{log.userName || log.userId?.name || 'System User'}</p>
                        <span className="badge badge-gray text-[10px]">{log.userRole}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        log.action?.includes('CREATE') ? 'bg-green-100 text-green-800 border border-green-200' :
                        log.action?.includes('RESOLVE') ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        log.action?.includes('UPDATE') ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-[11px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                        {log.resourceType}: {log.resourceId || 'N/A'}
                      </span>
                    </td>
                    <td className="text-xs text-surface-600">
                      {log.policeStationId?.name || 'Central Command'}
                    </td>
                    <td className="text-xs text-surface-700 max-w-sm">
                      <p className="font-medium leading-relaxed">{log.details}</p>
                      {log.previousValue && log.newValue && (
                        <div className="mt-1 p-1.5 bg-surface-100 rounded text-[10px] font-mono text-surface-600">
                          <span className="text-red-700">Prev: {JSON.stringify(log.previousValue)}</span>
                          <span className="text-green-700 ml-2">New: {JSON.stringify(log.newValue)}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
