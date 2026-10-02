import React, { useState, useEffect } from 'react';
import { complaintApi } from '../../api/complaint.api';
import { LoadingSpinner, ErrorState, StatusBadge, PageHeader, EmptyState } from '../../components/common/CommonUI';
import { FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../../socket/socket';

const MyCases = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const navigate = useNavigate();

  const fetchCases = async () => {
    try {
      const res = await complaintApi.getAll();
      if (res.success && res.data?.complaints) {
        setComplaints(res.data.complaints);
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load case files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();

    const socket = getSocket();
    if (socket) {
      const handleUpdate = () => fetchCases();
      socket.on('complaint:new', handleUpdate);
      socket.on('complaint:updated', handleUpdate);
      socket.on('suspect:created', handleUpdate);
      socket.on('suspect:updated', handleUpdate);

      return () => {
        socket.off('complaint:new', handleUpdate);
        socket.off('complaint:updated', handleUpdate);
        socket.off('suspect:created', handleUpdate);
        socket.off('suspect:updated', handleUpdate);
      };
    }
  }, []);

  if (loading) return <LoadingSpinner message="Fetching Assigned Case Files..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchCases} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Assigned Case Files"
        subtitle="Complaints assigned to your station or personal investigation roster"
        icon={FileText}
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th>Complaint ID</th>
                <th>Title</th>
                <th>Crime Type</th>
                <th>Complainant</th>
                <th>Status</th>
                <th>Filed At</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12">
                    <EmptyState
                      icon={FileText}
                      message="No assigned case files"
                      description="You currently have no active complaints assigned to your roster."
                    />
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">
                        {c.complaintId}
                      </span>
                    </td>
                    <td className="font-medium text-surface-900 max-w-xs truncate">{c.title}</td>
                    <td>
                      <span className="badge badge-gray font-mono text-[11px]">{c.crimeType?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="text-xs">{c.citizenId?.name || 'N/A'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="text-xs text-surface-400 font-mono">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="text-right">
                      <button
                        onClick={() => navigate(`/police/cases/${c._id}`)}
                        className="btn btn-ghost btn-sm text-primary-600 gap-1"
                      >
                        Investigate <ChevronRight className="h-3.5 w-3.5" />
                      </button>
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

export default MyCases;
