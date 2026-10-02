import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stationApi } from '../../api/station.api';
import { officerApi } from '../../api/officer.api';
import { LoadingSpinner, ErrorState, StatusBadge, PageHeader, DutyDot } from '../../components/common/CommonUI';
import { Building2, Phone, MapPin, Shield, Users, ArrowLeft, X } from 'lucide-react';

const StationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [station, setStation]           = useState(null);
  const [officers, setOfficers]         = useState([]);
  const [loading, setLoading]          = useState(true);
  const [error, setError]               = useState('');

  const [assignModalOpen, setAssignModalOpen]             = useState(false);
  const [selectedOfficerUserId, setSelectedOfficerUserId] = useState('');
  const [assigning, setAssigning]                         = useState(false);

  const fetchDetails = async () => {
    try {
      const [stationRes, officersRes] = await Promise.all([
        stationApi.getById(id),
        officerApi.getAll({ stationId: id })
      ]);

      if (stationRes.success && stationRes.data?.station) {
        setStation(stationRes.data.station);
      }
      if (officersRes.success && officersRes.data?.officers) {
        setOfficers(officersRes.data.officers);
      }
    } catch (err) {
      console.error('Failed to fetch station details:', err);
      setError(err.response?.data?.message || err.message || 'Station details unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleAssignHead = async (e) => {
    e.preventDefault();
    if (!selectedOfficerUserId) return;
    setAssigning(true);
    try {
      const res = await stationApi.assignHead(id, selectedOfficerUserId);
      if (res.success) {
        setAssignModalOpen(false);
        fetchDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign Station Head');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading Station Dossier..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchDetails} />;
  if (!station) return <ErrorState message="Police Station not found" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => navigate('/admin/stations')}
        className="btn btn-ghost btn-sm gap-2 text-surface-500 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Stations Directory
      </button>

      {/* Station Header Card */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-100 pb-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-surface-900">{station.name}</h1>
                <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
                  {station.stationCode}
                </span>
                <StatusBadge status={station.status} />
              </div>
              <p className="text-xs text-surface-500 mt-1 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-surface-400" /> {station.address}
              </p>
            </div>
          </div>

          <button
            onClick={() => setAssignModalOpen(true)}
            className="btn btn-primary btn-sm"
          >
            Assign Station Head
          </button>
        </div>

        {/* Info Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
          <div>
            <span className="text-surface-400 block uppercase font-semibold text-[10px]">Contact Phone</span>
            <span className="font-semibold text-surface-900 flex items-center gap-1.5 mt-0.5">
              <Phone className="h-3.5 w-3.5 text-surface-400" /> {station.phone}
            </span>
          </div>
          <div>
            <span className="text-surface-400 block uppercase font-semibold text-[10px]">Station Head</span>
            <span className="font-semibold text-success-700 flex items-center gap-1.5 mt-0.5">
              <Shield className="h-3.5 w-3.5 text-success-600" /> {station.stationHeadId?.name || 'Unassigned'}
            </span>
          </div>
          <div>
            <span className="text-surface-400 block uppercase font-semibold text-[10px]">Assigned Officers</span>
            <span className="font-semibold text-surface-900 flex items-center gap-1.5 mt-0.5">
              <Users className="h-3.5 w-3.5 text-surface-400" /> {officers.length} Active Personnel
            </span>
          </div>
        </div>
      </div>

      {/* Officers Roster Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-surface-800">Station Officers Roster</h2>
          </div>
          <span className="badge badge-gray">{officers.length} Officers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th>Officer Name</th>
                <th>Badge Number</th>
                <th>Rank</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Duty Status</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {officers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-surface-400">
                    No officers currently stationed here.
                  </td>
                </tr>
              ) : (
                officers.map((off) => (
                  <tr key={off._id}>
                    <td className="font-semibold text-surface-900">{off.userId?.name}</td>
                    <td className="font-mono text-xs text-primary-600 font-bold">{off.badgeNumber}</td>
                    <td className="text-xs">{off.rank?.replace(/_/g, ' ')}</td>
                    <td className="text-xs">{off.role?.replace(/_/g, ' ')}</td>
                    <td className="text-xs text-surface-500">{off.userId?.phone}</td>
                    <td><DutyDot status={off.dutyStatus} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Head Modal */}
      {assignModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md w-full">
            <div className="modal-header">
              <h2 className="modal-title">Assign Station Head</h2>
              <button onClick={() => setAssignModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAssignHead} className="space-y-4 text-xs">
              <div>
                <label className="input-label">Select Officer</label>
                <select
                  required
                  value={selectedOfficerUserId}
                  onChange={(e) => setSelectedOfficerUserId(e.target.value)}
                  className="select"
                >
                  <option value="">Choose an officer...</option>
                  {officers.map((off) => (
                    <option key={off.userId?._id} value={off.userId?._id}>
                      {off.userId?.name} ({off.rank} - {off.badgeNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setAssignModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={assigning} className="btn btn-primary">
                  {assigning ? 'Assigning...' : 'Assign Station Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationDetails;
