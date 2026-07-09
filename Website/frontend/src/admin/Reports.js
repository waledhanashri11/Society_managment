import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileBarChart, IndianRupee, MessageSquareWarning, WalletCards } from 'lucide-react';
import { maintenanceAPI, complaintAPI } from '../services/api';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const Reports = () => {
  const [reports, setReports] = useState({
    totalCollection: 0,
    pendingDues: 0,
    totalComplaints: 0,
    resolvedComplaints: 0,
    pendingComplaints: 0,
    inProgressComplaints: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const [maintenanceRes, complaintsRes] = await Promise.all([maintenanceAPI.getAll(), complaintAPI.getAll()]);
      const maintenance = maintenanceRes.data;
      const complaints = complaintsRes.data;
      const paidAmount = maintenance.filter((item) => item.status === 'paid').reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      const pendingAmount = maintenance.filter((item) => item.status === 'pending').reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

      setReports({
        totalCollection: paidAmount,
        pendingDues: pendingAmount,
        totalComplaints: complaints.length,
        resolvedComplaints: complaints.filter((item) => item.status === 'resolved').length,
        pendingComplaints: complaints.filter((item) => item.status === 'pending').length,
        inProgressComplaints: complaints.filter((item) => item.status === 'in_progress').length
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="portal-empty">Loading reports...</div>;

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div><h1>Reports & Analytics</h1><p>Financial collection and complaint resolution overview.</p></div>
        <div className="portal-date-chip"><FileBarChart size={15} /> This Year</div>
      </div>

      <div className="portal-kpis">
        <div className="portal-kpi green"><span>Total Collection</span><strong>{money(reports.totalCollection)}</strong><small>Paid maintenance</small><div className="portal-kpi-icon"><IndianRupee size={18} /></div></div>
        <div className="portal-kpi orange"><span>Pending Dues</span><strong>{money(reports.pendingDues)}</strong><small>Awaiting payment</small><div className="portal-kpi-icon"><WalletCards size={18} /></div></div>
        <div className="portal-kpi"><span>Total Complaints</span><strong>{reports.totalComplaints}</strong><small>All resident requests</small><div className="portal-kpi-icon"><MessageSquareWarning size={18} /></div></div>
        <div className="portal-kpi green"><span>Resolved</span><strong>{reports.resolvedComplaints}</strong><small>Completed complaints</small><div className="portal-kpi-icon"><CheckCircle2 size={18} /></div></div>
      </div>

      <div className="portal-dashboard-grid">
        <section className="portal-panel">
          <div className="portal-panel-head"><div><h2>Financial Report</h2><p>Collection versus pending dues.</p></div></div>
          <div className="portal-report-bars">
            <div><span>Total Collection</span><strong>{money(reports.totalCollection)}</strong><i style={{ width: `${Math.min(100, reports.totalCollection / Math.max(1, reports.totalCollection + reports.pendingDues) * 100)}%` }} /></div>
            <div><span>Pending Dues</span><strong>{money(reports.pendingDues)}</strong><i className="orange" style={{ width: `${Math.min(100, reports.pendingDues / Math.max(1, reports.totalCollection + reports.pendingDues) * 100)}%` }} /></div>
          </div>
        </section>

        <section className="portal-panel">
          <div className="portal-panel-head"><div><h2>Complaint Statistics</h2><p>Status split for all complaints.</p></div></div>
          <div className="portal-status-summary">
            <div><span>Pending</span><strong>{reports.pendingComplaints}</strong></div>
            <div><span>In Progress</span><strong>{reports.inProgressComplaints}</strong></div>
            <div><span>Resolved</span><strong>{reports.resolvedComplaints}</strong></div>
          </div>
        </section>
      </div>

      <section className="portal-panel">
        <div className="portal-panel-head"><div><h2>Summary</h2><p>Quick operational snapshot.</p></div></div>
        <div className="settings-status-grid">
          <div><span>Total Revenue</span><strong>{money(reports.totalCollection)}</strong></div>
          <div><span>Pending Collection</span><strong>{money(reports.pendingDues)}</strong></div>
          <div><span>Complaints Resolved</span><strong>{reports.resolvedComplaints}/{reports.totalComplaints}</strong></div>
          <div><span>Open Complaints</span><strong>{reports.pendingComplaints + reports.inProgressComplaints}</strong></div>
        </div>
      </section>
    </div>
  );
};

export default Reports;
