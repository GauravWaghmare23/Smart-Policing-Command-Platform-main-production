import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import PoliceLayout from '../layouts/PoliceLayout';

// Auth Pages
import Login from '../pages/auth/Login';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import Stations from '../pages/admin/Stations';
import StationDetails from '../pages/admin/StationDetails';
import Officers from '../pages/admin/Officers';
import OfficerDetails from '../pages/admin/OfficerDetails';
import Complaints from '../pages/admin/Complaints';
import ComplaintDetails from '../pages/admin/ComplaintDetails';
import FIRs from '../pages/admin/FIRs';
import SOSAlerts from '../pages/admin/SOSAlerts';
import CrimeIntelligence from '../pages/admin/CrimeIntelligence';
import PatrolPlanner from '../pages/admin/PatrolPlanner';
import Announcements from '../pages/admin/Announcements';
import Reports from '../pages/admin/Reports';
import SuspectDirectory from '../pages/admin/SuspectDirectory';
import CaseDossierView from '../pages/admin/CaseDossierView';
import AuditLogs from '../pages/admin/AuditLogs';
import CitizenProfilePage from '../pages/admin/CitizenProfilePage';

// Police Pages
import PoliceDashboard from '../pages/police/PoliceDashboard';
import MyCases from '../pages/police/MyCases';
import Patrols from '../pages/police/Patrols';
import OfficerProfilePage from '../pages/police/OfficerProfilePage';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes Container */}
      <Route element={<ProtectedRoute />}>
        {/* CONTROL_ROOM_ADMIN Routes */}
        <Route element={<RoleRoute allowedRoles={['CONTROL_ROOM_ADMIN']} />}>
          <Route path="/admin/*" element={
            <AdminLayout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="stations" element={<Stations />} />
                <Route path="stations/:id" element={<StationDetails />} />
                <Route path="officers" element={<Officers />} />
                <Route path="officers/:id" element={<OfficerProfilePage />} />
                <Route path="citizens/:id" element={<CitizenProfilePage />} />
                <Route path="complaints" element={<Complaints />} />
                <Route path="complaints/:id" element={<ComplaintDetails />} />
                <Route path="firs" element={<FIRs />} />
                <Route path="sos" element={<SOSAlerts />} />
                <Route path="crime-intelligence" element={<CrimeIntelligence />} />
                <Route path="patrol-planner" element={<PatrolPlanner />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="reports" element={<Reports />} />
                <Route path="suspects" element={<SuspectDirectory />} />
                <Route path="cases/dossier/:id" element={<CaseDossierView />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
            </AdminLayout>
          } />
        </Route>

        {/* POLICE OFFICERS Routes (STATION_HEAD, INVESTIGATING_OFFICER, FIELD_OFFICER) */}
        <Route element={<RoleRoute allowedRoles={['STATION_HEAD', 'INVESTIGATING_OFFICER', 'FIELD_OFFICER']} />}>
          <Route path="/police/*" element={
            <PoliceLayout>
              <Routes>
                <Route path="dashboard" element={<PoliceDashboard />} />
                <Route path="profile" element={<OfficerProfilePage />} />
                <Route path="cases" element={<MyCases />} />
                <Route path="cases/:id" element={<ComplaintDetails />} />
                <Route path="firs" element={<FIRs />} />
                <Route path="sos" element={<SOSAlerts />} />
                <Route path="officers" element={<Officers />} />
                <Route path="officers/:id" element={<OfficerProfilePage />} />
                <Route path="citizens/:id" element={<CitizenProfilePage />} />
                <Route path="patrols" element={<Patrols />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="suspects" element={<SuspectDirectory />} />
                <Route path="cases/dossier/:id" element={<CaseDossierView />} />
                <Route path="*" element={<Navigate to="/police/dashboard" replace />} />
              </Routes>
            </PoliceLayout>
          } />
        </Route>
      </Route>

      {/* Default Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
