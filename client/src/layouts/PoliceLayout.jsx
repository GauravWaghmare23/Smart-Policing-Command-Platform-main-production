import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from '../components/common/NotificationCenter';
import {
  LayoutDashboard,
  FileText,
  FileBadge,
  Siren,
  Route,
  Users,
  Megaphone,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

const PoliceLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNavItems = () => {
    const role = user?.role;
    if (role === 'STATION_HEAD') {
      return [
        { label: 'Dashboard',        path: '/police/dashboard',      icon: LayoutDashboard },
        { label: 'Complaints',       path: '/police/cases',          icon: FileText },
        { label: 'FIRs',             path: '/police/firs',           icon: FileBadge },
        { label: 'SOS Alerts',       path: '/police/sos',            icon: Siren },
        { label: 'Station Officers', path: '/police/officers',       icon: Users },
        { label: 'Patrol Routes',    path: '/police/patrols',        icon: Route },
        { label: 'Announcements',    path: '/police/announcements',  icon: Megaphone }
      ];
    } else if (role === 'INVESTIGATING_OFFICER') {
      return [
        { label: 'Dashboard',     path: '/police/dashboard',     icon: LayoutDashboard },
        { label: 'My Cases',      path: '/police/cases',         icon: FileText },
        { label: 'FIRs',          path: '/police/firs',          icon: FileBadge },
        { label: 'SOS Alerts',    path: '/police/sos',           icon: Siren },
        { label: 'Announcements', path: '/police/announcements', icon: Megaphone }
      ];
    } else {
      // FIELD_OFFICER
      return [
        { label: 'Dashboard',     path: '/police/dashboard',     icon: LayoutDashboard },
        { label: 'SOS Emergency', path: '/police/sos',           icon: Siren },
        { label: 'Patrol Routes', path: '/police/patrols',       icon: Route },
        { label: 'Announcements', path: '/police/announcements', icon: Megaphone }
      ];
    }
  };

  const navItems = getNavItems();

  const roleLabels = {
    STATION_HEAD:          'Station Head',
    INVESTIGATING_OFFICER: 'Investigating Officer',
    FIELD_OFFICER:         'Field Officer',
  };
  const roleLabel = roleLabels[user?.role] || user?.role;

  const currentItem = navItems.find(item => location.pathname.startsWith(item.path));

  // Role color accent
  const roleAccent = user?.role === 'FIELD_OFFICER'
    ? 'bg-warning-600'
    : user?.role === 'STATION_HEAD'
    ? 'bg-primary-700'
    : 'bg-primary-600';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-50">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-60 md:flex-col bg-white border-r border-surface-200 flex-shrink-0">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 h-16 px-5 border-b border-surface-200">
          <div className={`flex items-center justify-center h-8 w-8 ${roleAccent} rounded-lg flex-shrink-0`}>
            <Shield className="h-4.5 w-4.5 text-white" style={{ height: '18px', width: '18px' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-surface-900 leading-tight truncate">Smart Police</p>
            <p className="text-[10px] text-surface-400 font-medium uppercase tracking-widest">Operations</p>
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-widest px-2 mb-3">
            Operational Menu
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? `${roleAccent} text-white shadow-blue font-semibold`
                          : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-surface-200">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary-700">
                {user?.name?.charAt(0)?.toUpperCase() || 'O'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-surface-900 truncate">{user?.name}</p>
              <p className="text-[10px] text-surface-400 truncate">{roleLabel}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between bg-white border-b border-surface-200 px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-surface-500 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-surface-400 font-medium">{roleLabel}</span>
              {currentItem && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-surface-300" />
                  <span className="text-surface-800 font-semibold">{currentItem.label}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Duty status indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-full border border-primary-200">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse-soft" />
              <span className="text-xs font-semibold text-primary-700">Duty Active</span>
            </div>

            <NotificationCenter />

            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-surface-200">
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xs font-bold text-primary-700">
                  {user?.name?.charAt(0)?.toUpperCase() || 'O'}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-surface-900 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-surface-400">{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-surface-200 px-4 py-3 max-h-[80vh] overflow-y-auto animate-slide-up">
            <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-2">
              Operational Menu
            </p>
            <div className="grid grid-cols-2 gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 text-xs rounded-xl font-medium transition ${
                      isActive ? `${roleAccent} text-white` : 'text-surface-600 hover:bg-surface-100'
                    }`
                  }
                >
                  <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PoliceLayout;
