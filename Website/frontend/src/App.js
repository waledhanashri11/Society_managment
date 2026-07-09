import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/AdminDashboard';
import Residents from './admin/Residents';
import Flats from './admin/Flats';
import Maintenance from './admin/Maintenance';
import Complaints from './admin/Complaints';
import Notices from './admin/Notices';
import Staff from './admin/Staff';
import Reports from './admin/Reports';
import AdminSettings from './admin/AdminSettings';
import ResidentLayout from './resident/ResidentLayout';
import ResidentDashboard from './resident/ResidentDashboard';
import ResidentMaintenance from './resident/ResidentMaintenance';
import ResidentComplaints from './resident/ResidentComplaints';
import ResidentNotices from './resident/ResidentNotices';
import ResidentProfile from './resident/ResidentProfile';
import ResidentPaymentHistory from './resident/ResidentPaymentHistory';
import ResidentMembers from './resident/ResidentMembers';
import ResidentReports from './resident/ResidentReports';
import { getUser } from './utils/auth';

const PrivateRoute = ({ children, role }) => {
  const user = getUser();
  if (!user) {
    return <Navigate to="/login" />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/resident/dashboard'} />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route path="/admin" element={
          <PrivateRoute role="admin">
            <AdminLayout />
          </PrivateRoute>
        }>
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

        <Route path="/resident" element={
          <PrivateRoute role="resident">
            <ResidentLayout />
          </PrivateRoute>
        }>
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

        <Route path="/" element={<Landing />} />
      </Routes>
    </Router>
  );
}

export default App;
