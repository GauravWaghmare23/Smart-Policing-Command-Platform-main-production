import React from 'react';
import { AlertCircle, RefreshCw, FileX, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
export const StatCard = ({ title, value, icon: Icon, color = 'blue', description, trend }) => {
  const colorMap = {
    blue:   { icon: 'bg-primary-50 text-primary-600',    border: 'border-primary-100',  value: 'text-primary-700' },
    red:    { icon: 'bg-danger-50 text-danger-600',      border: 'border-danger-100',   value: 'text-danger-700' },
    amber:  { icon: 'bg-warning-50 text-warning-600',   border: 'border-warning-100',  value: 'text-warning-700' },
    green:  { icon: 'bg-success-50 text-success-600',   border: 'border-success-100',  value: 'text-success-700' },
    purple: { icon: 'bg-purple-50 text-purple-600',      border: 'border-purple-100',   value: 'text-purple-700' },
    gray:   { icon: 'bg-surface-100 text-surface-500',  border: 'border-surface-200',  value: 'text-surface-700' },
  };

  const style = colorMap[color] || colorMap.blue;

  return (
    <div className="card p-5 hover:shadow-card-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">{title}</p>
          <p className={`text-3xl font-bold tracking-tight ${style.value}`}>
            {value !== undefined ? value : 0}
          </p>
          {description && (
            <p className="text-xs text-surface-400 mt-1.5 truncate">{description}</p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend > 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-danger-500" />
              ) : trend < 0 ? (
                <TrendingDown className="h-3.5 w-3.5 text-success-500" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-surface-400" />
              )}
              <span className={`text-xs font-medium ${trend > 0 ? 'text-danger-600' : trend < 0 ? 'text-success-600' : 'text-surface-500'}`}>
                {Math.abs(trend)}% vs last period
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl flex-shrink-0 ${style.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const s = String(status || '').toUpperCase();

  const getStyle = () => {
    // Danger / Emergency
    if (['ACTIVE', 'CRITICAL', 'HIGH', 'REJECTED', 'CANCELLED', 'ESCALATED'].includes(s))
      return 'bg-danger-50 text-danger-700 ring-1 ring-danger-200';
    // Warning / In Progress
    if (['SUBMITTED', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'MEDIUM', 'PLANNED', 'BUSY', 'UNDER_INVESTIGATION'].includes(s))
      return 'bg-warning-50 text-warning-700 ring-1 ring-warning-200';
    // Success / Resolved
    if (['RESOLVED', 'COMPLETED', 'LOW', 'AVAILABLE', 'ON_DUTY', 'CLOSED', 'INACTIVE'].includes(s))
      return 'bg-success-50 text-success-700 ring-1 ring-success-100';
    // Info / Assigned
    if (['ASSIGNED', 'INVESTIGATION', 'DISPATCHED', 'FIR_REGISTERED', 'REGISTERED', 'ACTIVE_PATROL'].includes(s))
      return 'bg-primary-50 text-primary-700 ring-1 ring-primary-200';
    // Off Duty
    if (['OFF_DUTY'].includes(s))
      return 'bg-surface-100 text-surface-500 ring-1 ring-surface-200';

    return 'bg-surface-100 text-surface-600 ring-1 ring-surface-200';
  };

  const getDot = () => {
    if (['ACTIVE', 'CRITICAL', 'HIGH', 'ESCALATED', 'ACTIVE_PATROL'].includes(s)) return 'bg-danger-500 animate-pulse';
    if (['SUBMITTED', 'UNDER_REVIEW', 'MEDIUM', 'BUSY', 'PLANNED'].includes(s)) return 'bg-warning-500';
    if (['RESOLVED', 'COMPLETED', 'LOW', 'AVAILABLE', 'ON_DUTY', 'CLOSED'].includes(s)) return 'bg-success-500';
    if (['ASSIGNED', 'INVESTIGATION', 'DISPATCHED', 'FIR_REGISTERED', 'REGISTERED'].includes(s)) return 'bg-primary-500';
    return 'bg-surface-400';
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStyle()}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getDot()}`} />
      {String(status || 'UNKNOWN').replace(/_/g, ' ')}
    </span>
  );
};

// ─────────────────────────────────────────────
// PRIORITY BADGE
// ─────────────────────────────────────────────
export const PriorityBadge = ({ priority }) => {
  const p = String(priority || '').toUpperCase();
  const styles = {
    HIGH:   'bg-danger-50 text-danger-700 ring-1 ring-danger-200',
    MEDIUM: 'bg-warning-50 text-warning-700 ring-1 ring-warning-200',
    LOW:    'bg-success-50 text-success-700 ring-1 ring-success-100',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[p] || 'bg-surface-100 text-surface-600'}`}>
      {p || 'NORMAL'}
    </span>
  );
};

// ─────────────────────────────────────────────
// DUTY STATUS INDICATOR
// ─────────────────────────────────────────────
export const DutyDot = ({ status }) => {
  const s = String(status || '').toUpperCase();
  const colors = {
    AVAILABLE:  'bg-success-500',
    ON_DUTY:    'bg-primary-500',
    BUSY:       'bg-warning-500',
    OFF_DUTY:   'bg-surface-400',
  };
  const labels = {
    AVAILABLE:  'Available',
    ON_DUTY:    'On Duty',
    BUSY:       'Busy',
    OFF_DUTY:   'Off Duty',
  };
  return (
    <span className="inline-flex items-center gap-2 text-sm text-surface-700">
      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${colors[s] || 'bg-surface-400'}`} />
      {labels[s] || s.replace(/_/g, ' ')}
    </span>
  );
};

// ─────────────────────────────────────────────
// LOADING SPINNER
// ─────────────────────────────────────────────
export const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="flex h-64 w-full items-center justify-center rounded-2xl bg-white border border-surface-200 p-8">
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-4 border-surface-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-600 animate-spin" />
      </div>
      <p className="text-sm font-medium text-surface-500">{message}</p>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────
export const SkeletonCard = ({ lines = 3 }) => (
  <div className="card p-5 space-y-3 animate-pulse">
    <div className="h-4 bg-surface-200 rounded-lg w-1/3" />
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className={`h-3 bg-surface-100 rounded-lg ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

// ─────────────────────────────────────────────
// ERROR STATE
// ─────────────────────────────────────────────
export const ErrorState = ({ message = 'Unable to load data', onRetry }) => (
  <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-danger-200 bg-danger-50 p-8 text-center">
    <div className="p-3 bg-danger-100 rounded-full mb-4">
      <AlertCircle className="h-6 w-6 text-danger-600" />
    </div>
    <p className="text-sm font-semibold text-danger-800 mb-1">Something went wrong</p>
    <p className="text-sm text-danger-600 max-w-md mb-5">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="btn btn-secondary gap-2 text-sm"
      >
        <RefreshCw className="h-4 w-4" /> Try Again
      </button>
    )}
  </div>
);

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────
export const EmptyState = ({ icon: Icon = FileX, message = 'No records found', description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
    <div className="p-4 bg-surface-100 rounded-2xl mb-4">
      <Icon className="h-8 w-8 text-surface-400" />
    </div>
    <p className="text-sm font-semibold text-surface-700 mb-1">{message}</p>
    {description && <p className="text-sm text-surface-400 max-w-sm mb-5">{description}</p>}
    {action && action}
  </div>
);

// ─────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, icon: Icon, action, breadcrumb }) => (
  <div className="pb-6 border-b border-surface-200 mb-6">
    {breadcrumb && (
      <p className="text-xs text-surface-400 font-medium mb-2">{breadcrumb}</p>
    )}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2.5 bg-primary-50 rounded-xl">
            <Icon className="h-5 w-5 text-primary-600" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-surface-900">{title}</h1>
          {subtitle && <p className="text-sm text-surface-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  </div>
);

// ─────────────────────────────────────────────
// INFO ROW (for detail pages)
// ─────────────────────────────────────────────
export const InfoRow = ({ label, value, mono = false }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 border-b border-surface-100 last:border-0">
    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider sm:w-40 flex-shrink-0">{label}</span>
    <span className={`text-sm text-surface-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
  </div>
);

// ─────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────
export const SectionCard = ({ title, icon: Icon, children, action, className = '' }) => (
  <div className={`card overflow-hidden ${className}`}>
    <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="h-4 w-4 text-primary-500" />}
        <h2 className="text-sm font-semibold text-surface-800">{title}</h2>
      </div>
      {action && <div>{action}</div>}
    </div>
    <div className="p-5">{children}</div>
  </div>
);
