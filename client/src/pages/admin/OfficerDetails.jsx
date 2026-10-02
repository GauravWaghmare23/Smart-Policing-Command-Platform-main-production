import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { officerApi } from '../../api/officer.api';
import { stationApi } from '../../api/station.api';
import { LoadingSpinner, ErrorState, StatusBadge, DutyDot } from '../../components/common/CommonUI';
import PoliceMap from '../../components/maps/PoliceMap';
import { Shield, Phone, Mail, MapPin, ArrowLeft, Building2, X } from 'lucide-react';

const OfficerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [officer, setOfficer]           = useState(null);
  const [stations, setStations]         = useState([]);
  const [loading, setLoading]          = useState(true);
  const [error, setError]               = useState('');

  const [transferModalOpen, setTransferModalOpen]   = useState(false);
  const [selectedStationId, setSelectedStationId] = useState('');
  const [transferring, setTransferring]           = useState(false);

  const fetchDetails = async () => {
    try {
      const [offRes, stRes] = await Promise.all([
        officerApi.getById(id),
        stationApi.getAll()
      ]);

      if (offRes.success && offRes.data?.officer) {
        setOfficer(offRes.data.officer);
      }
      if (stRes.success && stRes.data?.stations) {
        setStations(stRes.data.stations);
      }
    } catch (err) {
      console.error('Failed to fetch officer details:', err);
      setError(err.response?.data?.message || err.message || 'Officer profile unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedStationId) return;
    setTransferring(true);
    try {
      const res = await officerApi.transfer(id, selectedStationId);
      if (res.success) {
        setTransferModalOpen(false);
        fetchDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to transfer officer');
    } finally {
      setTransferring(false);
    }
  };

  if (loading) return <LoadingSpinner message="Retrieving Officer Personnel File..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchDetails} />;
  if (!officer) return <ErrorState message="Officer record not found" />;

  const user = officer.userId || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => navigate('/admin/officers')}
        className="btn btn-ghost btn-sm gap-2 text-surface-500 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Personnel Directory
      </button>

      {/* Header Profile Dossier */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-100 pb-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-base font-bold text-primary-700">
                {user.name?.charAt(0)?.toUpperCase() || 'O'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-surface-900">{user.name}</h1>
                <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
                  {officer.badgeNumber}
                </span>
                <DutyDot status={officer.dutyStatus} />
              </div>
              <p className="text-xs text-surface-500 mt-1 flex items-center gap-2">
                <span className="font-semibold text-surface-800">{officer.rank?.replace(/_/g, ' ')}</span> • <span className="font-mono text-primary-600">{officer.role?.replace(/_/g, ' ')}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setTransferModalOpen(true)}
            className="btn btn-primary btn-sm"
          >
            Transfer Station Assignment
          </button>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-surface-400 block uppercase font-semibold text-[10px]">Email Contact</span>
            <span className="font-semibold text-surface-900 flex items-center gap-1.5 mt-0.5">
              <Mail className="h-3.5 w-3.5 text-surface-400" /> {user.email}
            </span>
          </div>
          <div>
            <span className="text-surface-400 block uppercase font-semibold text-[10px]">Phone Contact</span>
            <span className="font-semibold text-surface-900 flex items-center gap-1.5 mt-0.5">
              <Phone className="h-3.5 w-3.5 text-surface-400" /> {user.phone}
            </span>
          </div>
          <div>
            <span className="text-surface-400 block uppercase font-semibold text-[10px]">Assigned Station</span>
            <span className="font-semibold text-primary-600 flex items-center gap-1.5 mt-0.5">
              <Building2 className="h-3.5 w-3.5 text-primary-500" /> {officer.stationId?.name || 'Unassigned'}
            </span>
          </div>
          <div>
            <span className="text-surface-400 block uppercase font-semibold text-[10px]">Last Location Ping</span>
            <span className="font-semibold text-surface-700 mt-0.5 block">
              {officer.lastLocationUpdate ? new Date(officer.lastLocationUpdate).toLocaleString() : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Officer GPS Location Map */}
      <div className="card p-4">
        <h2 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary-500" /> Live Duty GPS Telemetry
        </h2>
        <PoliceMap
          officers={[officer]}
          height="h-[300px]"
          title={`GPS Monitor: ${user.name} (${officer.badgeNumber})`}
        />
      </div>

      {/* Transfer Modal */}
      {transferModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md w-full">
            <div className="modal-header">
              <h2 className="modal-title">Transfer Officer</h2>
              <button onClick={() => setTransferModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="space-y-4 text-xs">
              <div>
                <label className="input-label">Destination Police Station</label>
                <select
                  required
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="select"
                >
                  <option value="">Select target station...</option>
                  {stations.map((st) => (
                    <option key={st._id} value={st._id}>
                      {st.name} ({st.stationCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setTransferModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={transferring} className="btn btn-primary">
                  {transferring ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficerDetails;
