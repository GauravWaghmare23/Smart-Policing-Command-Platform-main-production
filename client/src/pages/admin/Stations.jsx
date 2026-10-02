import React, { useState, useEffect } from 'react';
import { stationApi } from '../../api/station.api';
import { LoadingSpinner, ErrorState, StatusBadge, PageHeader, EmptyState } from '../../components/common/CommonUI';
import { Building2, Plus, Phone, MapPin, X, Users, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const INITIAL_FORM = {
  name: '', stationCode: '', address: '', phone: '', latitude: '', longitude: ''
};

const Stations = () => {
  const [stations, setStations]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [formData, setFormData]       = useState(INITIAL_FORM);
  const [formError, setFormError]     = useState('');

  const navigate = useNavigate();

  const fetchStations = async () => {
    try {
      const res = await stationApi.getAll();
      if (res.success && res.data?.stations) setStations(res.data.stations);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load police stations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStations(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        stationCode: formData.stationCode,
        address: formData.address,
        phone: formData.phone,
        location: {
          latitude:  parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude)
        }
      };
      const res = await stationApi.create(payload);
      if (res.success) {
        setIsModalOpen(false);
        setFormData(INITIAL_FORM);
        fetchStations();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create police station');
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({ label, children }) => (
    <div>
      <label className="input-label">{label}</label>
      {children}
    </div>
  );

  if (loading) return <LoadingSpinner message="Loading police stations..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchStations} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Police Stations"
        subtitle="Manage jurisdictional police station units across Nagpur"
        icon={Building2}
        action={
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm gap-2">
            <Plus className="h-4 w-4" /> Add Station
          </button>
        }
      />

      {/* Stations Grid */}
      {stations.length === 0 ? (
        <EmptyState
          icon={Building2}
          message="No stations registered"
          description="Add your first police station to get started."
          action={
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm">
              Add Police Station
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station) => (
            <div
              key={station._id}
              onClick={() => navigate(`/admin/stations/${station._id}`)}
              className="card-hover p-5 group"
            >
              {/* Station Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                    <Building2 className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-surface-900 leading-tight">{station.name}</h3>
                    <span className="text-xs font-mono text-primary-600 font-semibold">{station.stationCode}</span>
                  </div>
                </div>
                <StatusBadge status={station.status} />
              </div>

              {/* Station Info */}
              <div className="space-y-2.5 mb-4">
                <div className="flex items-start gap-2 text-xs text-surface-500">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-surface-400" />
                  <span className="line-clamp-2">{station.address}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-surface-500">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0 text-surface-400" />
                  <span>{station.phone}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3.5 border-t border-surface-100 flex items-center justify-between">
                <div className="text-xs text-surface-500">
                  Station Head:{' '}
                  <span className="font-semibold text-surface-800">
                    {station.stationHeadId?.name || 'Unassigned'}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-surface-300 group-hover:text-primary-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Station Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md w-full">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Register Police Station</h2>
                <p className="text-sm text-surface-500 mt-0.5">Add a new station to the network</p>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setFormError(''); }}
                className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-xl transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Station Name">
                <input
                  type="text" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Sitabuldi Police Station"
                  className="input"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Station Code">
                  <input
                    type="text" required value={formData.stationCode}
                    onChange={(e) => setFormData({ ...formData, stationCode: e.target.value })}
                    placeholder="SIT-NGP"
                    className="input"
                  />
                </Field>
                <Field label="Contact Phone">
                  <input
                    type="text" required value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0712-2540001"
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Physical Address">
                <input
                  type="text" required value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Sitabuldi, Nagpur, Maharashtra"
                  className="input"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude">
                  <input
                    type="number" step="any" required value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="21.1443"
                    className="input"
                  />
                </Field>
                <Field label="Longitude">
                  <input
                    type="number" step="any" required value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="79.0803"
                    className="input"
                  />
                </Field>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setFormError(''); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Register Station'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stations;
