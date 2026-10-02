import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { officerApi } from '../../api/officer.api';
import { stationApi } from '../../api/station.api';
import { LoadingSpinner, ErrorState, StatusBadge, DutyDot, PageHeader, EmptyState } from '../../components/common/CommonUI';
import { Users, Plus, Shield, MapPin, X, ChevronRight } from 'lucide-react';

const INITIAL_FORM = {
  name: '', email: '', phone: '', password: '',
  badgeNumber: '', rank: 'SUB_INSPECTOR',
  role: 'INVESTIGATING_OFFICER', stationId: ''
};

const Officers = () => {
  const [officers, setOfficers]     = useState([]);
  const [stations, setStations]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [formData, setFormData]       = useState(INITIAL_FORM);
  const [formError, setFormError]     = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [offRes, stRes] = await Promise.all([officerApi.getAll(), stationApi.getAll()]);
      if (offRes.success && offRes.data?.officers) setOfficers(offRes.data.officers);
      if (stRes.success && stRes.data?.stations)  setStations(stRes.data.stations);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load officers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await officerApi.create(formData);
      if (res.success) {
        setIsModalOpen(false);
        setFormData(INITIAL_FORM);
        fetchData();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register police officer');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = officers.filter((off) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      off.userId?.name?.toLowerCase().includes(q) ||
      off.badgeNumber?.toLowerCase().includes(q) ||
      off.rank?.toLowerCase().includes(q) ||
      off.stationId?.name?.toLowerCase().includes(q)
    );
  });

  const Field = ({ label, children }) => (
    <div>
      <label className="input-label">{label}</label>
      {children}
    </div>
  );

  if (loading) return <LoadingSpinner message="Loading officers directory..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Police Officers"
        subtitle={`${officers.length} officers across ${stations.length} stations`}
        icon={Users}
        action={
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm gap-2">
            <Plus className="h-4 w-4" /> Add Officer
          </button>
        }
      />

      {/* Search */}
      <div className="card p-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, badge number, rank, or station..."
          className="input"
        />
      </div>

      {/* Officers Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th>Officer</th>
                <th>Badge</th>
                <th>Rank</th>
                <th>Role</th>
                <th>Station</th>
                <th>Duty Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12">
                    <EmptyState
                      icon={Users}
                      message={searchQuery ? 'No officers found' : 'No officers registered'}
                      description={searchQuery ? 'Try a different search term.' : 'Add your first police officer to get started.'}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((off) => (
                  <tr key={off._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-700">
                            {off.userId?.name?.charAt(0)?.toUpperCase() || 'O'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-surface-900">{off.userId?.name || 'N/A'}</p>
                          <p className="text-xs text-surface-400">{off.userId?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-mono font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">
                        {off.badgeNumber}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-medium text-surface-700">
                        {off.rank?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-surface-500 bg-surface-100 px-2 py-1 rounded-lg font-medium">
                        {off.role?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="text-xs text-surface-600">{off.stationId?.name || 'Unassigned'}</td>
                    <td><DutyDot status={off.dutyStatus} /></td>
                    <td className="text-right">
                      <button
                        onClick={() => navigate(`/admin/officers/${off._id}`)}
                        className="btn btn-ghost btn-sm gap-1 text-primary-600"
                      >
                        View <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Officer Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-lg w-full">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Register Police Officer</h2>
                <p className="text-sm text-surface-500 mt-0.5">Create a new officer account</p>
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full Name">
                  <input type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Sub-Inspector Amit Shinde" className="input" />
                </Field>
                <Field label="Official Email">
                  <input type="email" required value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="amit.shinde@smartpolice.local" className="input" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Contact Phone">
                  <input type="text" required value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543211" className="input" />
                </Field>
                <Field label="Password">
                  <input type="password" required value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••" className="input" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Badge Number">
                  <input type="text" required value={formData.badgeNumber}
                    onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                    placeholder="BADGE002" className="input" />
                </Field>
                <Field label="Assigned Station">
                  <select value={formData.stationId}
                    onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                    className="select">
                    <option value="">Unassigned</option>
                    {stations.map((st) => (
                      <option key={st._id} value={st._id}>{st.name} ({st.stationCode})</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Rank">
                  <select value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    className="select">
                    <option value="COMMISSIONER">Commissioner</option>
                    <option value="INSPECTOR">Inspector</option>
                    <option value="SUB_INSPECTOR">Sub Inspector</option>
                    <option value="ASSISTANT_SUB_INSPECTOR">Asst. Sub Inspector</option>
                    <option value="HEAD_CONSTABLE">Head Constable</option>
                    <option value="CONSTABLE">Constable</option>
                  </select>
                </Field>
                <Field label="Operational Role">
                  <select value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="select">
                    <option value="STATION_HEAD">Station Head</option>
                    <option value="INVESTIGATING_OFFICER">Investigating Officer</option>
                    <option value="FIELD_OFFICER">Field Officer</option>
                  </select>
                </Field>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => { setIsModalOpen(false); setFormError(''); }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Officer Account'
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

export default Officers;
