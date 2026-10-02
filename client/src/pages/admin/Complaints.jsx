import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintApi } from '../../api/complaint.api';
import { LoadingSpinner, ErrorState, StatusBadge, PriorityBadge, PageHeader, EmptyState } from '../../components/common/CommonUI';
import { FileText, Search, Filter, ChevronRight, X } from 'lucide-react';

const STATUSES  = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'INVESTIGATION', 'FIR_REGISTERED', 'RESOLVED', 'REJECTED'];
const CRIME_TYPES = ['THEFT', 'ASSAULT', 'FRAUD', 'CYBER_CRIME', 'HARASSMENT', 'MISSING_PERSON', 'VANDALISM', 'TRAFFIC', 'OTHER'];

const Complaints = () => {
  const [complaints,         setComplaints]         = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState('');
  const [statusFilter,       setStatusFilter]       = useState('');
  const [crimeTypeFilter,    setCrimeTypeFilter]    = useState('');
  const [searchQuery,        setSearchQuery]        = useState('');

  const navigate = useNavigate();

  const fetchComplaints = async () => {
    try {
      const res = await complaintApi.getAll();
      if (res.success && res.data?.complaints) {
        setComplaints(res.data.complaints);
        setFilteredComplaints(res.data.complaints);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, []);

  useEffect(() => {
    let result = [...complaints];
    if (statusFilter)    result = result.filter((c) => c.status === statusFilter);
    if (crimeTypeFilter) result = result.filter((c) => c.crimeType === crimeTypeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.complaintId?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          c.citizenId?.name?.toLowerCase().includes(q)
      );
    }
    setFilteredComplaints(result);
  }, [statusFilter, crimeTypeFilter, searchQuery, complaints]);

  const hasFilters = statusFilter || crimeTypeFilter || searchQuery;
  const clearFilters = () => { setStatusFilter(''); setCrimeTypeFilter(''); setSearchQuery(''); };

  if (loading) return <LoadingSpinner message="Loading complaints register..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchComplaints} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Complaints Register"
        subtitle={`${complaints.length} total complaints · ${filteredComplaints.length} shown`}
        icon={FileText}
      />

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search complaint ID, title, citizen..."
              className="input pl-10"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>

          {/* Crime Type Filter */}
          <select
            value={crimeTypeFilter}
            onChange={(e) => setCrimeTypeFilter(e.target.value)}
            className="select"
          >
            <option value="">All Crime Types</option>
            {CRIME_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-100">
            <p className="text-xs text-surface-500">
              Showing <span className="font-semibold text-surface-800">{filteredComplaints.length}</span> of {complaints.length} complaints
            </p>
            <button
              onClick={clearFilters}
              className="btn btn-ghost btn-sm text-xs gap-1.5 text-surface-500"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th>Complaint ID</th>
                <th>Title</th>
                <th>Crime Type</th>
                <th>Priority</th>
                <th>Citizen</th>
                <th>Station</th>
                <th>Assigned Officer</th>
                <th>Status</th>
                <th>Filed</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12">
                    <EmptyState
                      icon={FileText}
                      message={hasFilters ? 'No complaints match your filters' : 'No complaints registered'}
                      description={hasFilters ? 'Try adjusting or clearing your filters.' : 'Complaints filed by citizens will appear here.'}
                      action={hasFilters ? (
                        <button onClick={clearFilters} className="btn btn-secondary btn-sm">Clear Filters</button>
                      ) : null}
                    />
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <span className="text-xs font-mono font-bold text-primary-600">{c.complaintId}</span>
                    </td>
                    <td>
                      <p className="text-sm font-medium text-surface-900 max-w-[180px] truncate">{c.title}</p>
                    </td>
                    <td>
                      <span className="badge badge-gray text-[11px]">{c.crimeType?.replace(/_/g, ' ')}</span>
                    </td>
                    <td><PriorityBadge priority={c.priority} /></td>
                    <td className="text-xs text-surface-600">{c.citizenId?.name || 'N/A'}</td>
                    <td className="text-xs text-surface-500 max-w-[130px] truncate">{c.policeStationId?.name || 'Unassigned'}</td>
                    <td>
                      <span className="text-xs font-medium text-success-700">
                        {c.assignedOfficerId?.name || '—'}
                      </span>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="text-xs text-surface-400">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => navigate(`/admin/complaints/${c._id}`)}
                        className="btn btn-ghost btn-sm text-primary-600 gap-1"
                      >
                        Details <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredComplaints.length > 0 && (
          <div className="px-4 py-3 border-t border-surface-100 bg-surface-50 text-xs text-surface-500">
            Showing {filteredComplaints.length} complaint{filteredComplaints.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default Complaints;
