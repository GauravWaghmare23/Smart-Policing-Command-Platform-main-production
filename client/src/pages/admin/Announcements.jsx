import React, { useState, useEffect } from 'react';
import { announcementApi } from '../../api/announcement.api';
import { LoadingSpinner, ErrorState, StatusBadge, PageHeader, EmptyState } from '../../components/common/CommonUI';
import { Megaphone, Plus, Bell, Calendar, X, AlertTriangle, ShieldCheck, MapPin, Clock } from 'lucide-react';

const INITIAL_FORM = {
  title: '',
  message: '',
  type: 'GENERAL',
  severity: 'MEDIUM',
  targetAreaName: '',
  expiresAt: '',
};

const TYPE_LABELS = {
  GENERAL: 'General',
  EMERGENCY: '🚨 Emergency',
  WEATHER: '🌧️ Weather',
  TRAFFIC: '🚗 Traffic',
  CRIME: '⚠️ Crime Alert',
};

const SEVERITY_COLORS = {
  HIGH:     'border-l-danger-500',
  MEDIUM:   'border-l-warning-500',
  LOW:      'border-l-primary-500',
  CRITICAL: 'border-l-red-700',
};

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [formData, setFormData]           = useState(INITIAL_FORM);

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementApi.getAll();
      if (res.success && res.data?.announcements) {
        setAnnouncements(res.data.announcements);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
      setError(err.response?.data?.message || err.message || 'Announcements unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Send correctly-named fields that match the backend controller
      const payload = {
        title:          formData.title,
        message:        formData.message,
        type:           formData.type,
        severity:       formData.severity,
        targetAreaName: formData.targetAreaName,
        expiresAt:      formData.expiresAt || undefined,
      };
      const res = await announcementApi.create(payload);
      if (res.success) {
        setIsModalOpen(false);
        setFormData(INITIAL_FORM);
        fetchAnnouncements();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to broadcast announcement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Fetching Public Safety Advisories..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchAnnouncements} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Public Safety Announcements"
        subtitle="Broadcast advisories and emergency bulletins to citizen application"
        icon={Megaphone}
        action={
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm gap-2">
            <Plus className="h-4 w-4" /> Broadcast Advisory
          </button>
        }
      />

      {/* Announcements Feed */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            message="No public safety announcements active"
            description="Create a broadcast advisory to notify citizens in target areas."
            action={
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm">
                Create Announcement
              </button>
            }
          />
        ) : (
          announcements.map((ann) => (
            <div
              key={ann._id}
              className={`card p-5 border-l-4 transition-all ${SEVERITY_COLORS[ann.severity] || 'border-l-primary-500'} bg-white`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-base font-bold text-surface-900">{ann.title}</span>
                  <StatusBadge status={ann.severity || ann.priority} />
                  {ann.type && ann.type !== 'GENERAL' && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-100 text-surface-600">
                      {TYPE_LABELS[ann.type] || ann.type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-surface-400 font-mono flex-wrap">
                  {/* targetArea is an object from backend: {name, latitude, longitude, radius} */}
                  {(ann.targetArea?.name || ann.targetArea) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <b className="text-surface-700">
                        {typeof ann.targetArea === 'object' ? ann.targetArea.name : ann.targetArea}
                      </b>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-surface-600 leading-relaxed bg-surface-50 p-3 rounded-xl border border-surface-100 mb-3">
                {ann.message}
              </p>

              <div className="flex items-center justify-between text-[11px] text-surface-400 pt-2 border-t border-surface-100">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-success-600" /> Authorized Control Room Broadcast
                </span>
                {ann.expiresAt && (
                  <span className="font-mono">
                    Expires: {new Date(ann.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Broadcast Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-lg w-full">
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 rounded-xl">
                  <Megaphone className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="modal-title">Broadcast Safety Advisory</h2>
                  <p className="text-sm text-surface-500 mt-0.5">Send alert to citizen mobile applications</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-xl transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label">Advisory Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Heavy Traffic Congestion at Sitabuldi Square"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Alert Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="select"
                  >
                    <option value="GENERAL">General</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="WEATHER">Weather</option>
                    <option value="TRAFFIC">Traffic</option>
                    <option value="CRIME">Crime Alert</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Severity Level</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="select"
                  >
                    <option value="LOW">Low / Information</option>
                    <option value="MEDIUM">Medium / Warning</option>
                    <option value="HIGH">High / Urgent</option>
                    <option value="CRITICAL">Critical / Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Target Jurisdictional Area</label>
                <input
                  type="text"
                  value={formData.targetAreaName}
                  onChange={(e) => setFormData({ ...formData, targetAreaName: e.target.value })}
                  placeholder="e.g. Sitabuldi / Dharampeth / Citywide"
                  className="input"
                />
              </div>

              <div>
                <label className="input-label">Advisory Message Content</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Provide clear public safety instructions or warning details..."
                  className="input py-2.5"
                />
              </div>

              <div>
                <label className="input-label">Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="input"
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? 'Broadcasting...' : 'Publish Advisory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
