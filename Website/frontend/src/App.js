import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './utils/auth';

const Landing = lazy(() => import('./pages/Landing'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const RefundRules = lazy(() => import('./pages/RefundRules'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const Residents = lazy(() => import('./admin/Residents'));
const Flats = lazy(() => import('./admin/Flats'));
const Maintenance = lazy(() => import('./admin/Maintenance'));
const Complaints = lazy(() => import('./admin/Complaints'));
const Notices = lazy(() => import('./admin/Notices'));
const Staff = lazy(() => import('./admin/Staff'));
const Reports = lazy(() => import('./admin/Reports'));
const AdminSettings = lazy(() => import('./admin/AdminSettings'));

const ResidentLayout = lazy(() => import('./resident/ResidentLayout'));
const ResidentDashboard = lazy(() => import('./resident/ResidentDashboard'));
const ResidentMaintenance = lazy(() => import('./resident/ResidentMaintenance'));
const ResidentComplaints = lazy(() => import('./resident/ResidentComplaints'));
const ResidentNotices = lazy(() => import('./resident/ResidentNotices'));
const ResidentProfile = lazy(() => import('./resident/ResidentProfile'));
const ResidentPaymentHistory = lazy(() => import('./resident/ResidentPaymentHistory'));
const ResidentMembers = lazy(() => import('./resident/ResidentMembers'));
const ResidentReports = lazy(() => import('./resident/ResidentReports'));

const RouteLoader = () => (
  <div className="loading-spinner" role="status" aria-live="polite">
    Loading...
  </div>
);

const PrivateRoute = ({ children, role }) => {
  const user = getUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/resident/dashboard'} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/refunds" element={<RefundRules />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/admin"
            element={
              <PrivateRoute role="admin">
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="residents" element={<Residents />} />
            <Route path="flats" element={<Flats />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="notices" element={<Notices />} />
            <Route path="staff" element={<Staff />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route
            path="/resident"
            element={
              <PrivateRoute role="resident">
                <ResidentLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ResidentDashboard />} />
            <Route path="maintenance" element={<ResidentMaintenance />} />
            <Route path="complaints" element={<ResidentComplaints />} />
            <Route path="notices" element={<ResidentNotices />} />
            <Route path="profile" element={<ResidentProfile />} />
            <Route path="members" element={<ResidentMembers />} />
            <Route path="reports" element={<ResidentReports />} />
            <Route path="payments" element={<ResidentPaymentHistory />} />
            <Route path="payment-history" element={<ResidentPaymentHistory />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
