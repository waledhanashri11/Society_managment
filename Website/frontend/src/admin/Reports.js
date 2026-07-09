import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileBarChart, IndianRupee, MessageSquareWarning, RefreshCw, WalletCards } from 'lucide-react';
import { maintenanceAPI, complaintAPI } from '../services/api';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const isPaid = (status) => String(status || '').toLowerCase() === 'paid';
const isOpen = (status) => !isPaid(status);

const Reports = () => {
  const [bills, setBills] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const [billsRes, complaintsRes] = await Promise.all([
        maintenanceAPI.getBills(),
        complaintAPI.getAll()
      ]);
      setBills(unwrap(billsRes));
      setComplaints(unwrap(complaintsRes));
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.response?.data?.message || 'Could not load reports. Please make sure backend and database are running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const reports = useMemo(() => {
    const totalCollection = bills
      .filter((bill) => isPaid(bill.payment_status || bill.status))
      .reduce((sum, bill) => sum + Number(bill.paid_amount || bill.total_amount || bill.amount || 0), 0);

    const pendingDues = bills
      .filter((bill) => isOpen(bill.payment_status || bill.status))
      .reduce((sum, bill) => sum + Number(bill.remaining_amount || bill.total_amount || bill.amount || 0), 0);

    const resolvedComplaints = complaints.filter((item) => item.status === 'resolved').length;
    const pendingComplaints = complaints.filter((item) => item.status === 'pending').length;
    const inProgressComplaints = complaints.filter((item) => item.status === 'in_progress').length;

    return {
      totalCollection,
      pendingDues,
      totalComplaints: complaints.length,
      resolvedComplaints,
      pendingComplaints,
      inProgressComplaints,
      totalBills: bills.length,
      paidBills: bills.filter((bill) => isPaid(bill.payment_status || bill.status)).length,
      pendingBills: bills.filter((bill) => isOpen(bill.payment_status || bill.status)).length
    };
  }, [bills, complaints]);

  if (loading) return <div className="portal-empty">Loading reports...</div>;

  const financialTotal = reports.totalCollection + reports.pendingDues;
  const collectionWidth = Math.round((reports.totalCollection / Math.max(1, financialTotal)) * 100);
  const pendingWidth = Math.round((reports.pendingDues / Math.max(1, financialTotal)) * 100);

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div><h1>Reports & Analytics</h1><p>Financial collection and complaint resolution overview.</p></div>
        <button className="portal-light-btn" onClick={fetchReports}><RefreshCw size={15} /> Refresh</button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="portal-kpis">
        <div className="portal-kpi green"><span>Total Collection</span><strong>{money(reports.totalCollection)}</strong><small>{reports.paidBills} paid bills</small><div className="portal-kpi-icon"><IndianRupee size={18} /></div></div>
        <div className="portal-kpi orange"><span>Pending Dues</span><strong>{money(reports.pendingDues)}</strong><small>{reports.pendingBills} bills awaiting payment</small><div className="portal-kpi-icon"><WalletCards size={18} /></div></div>
        <div className="portal-kpi"><span>Total Complaints</span><strong>{reports.totalComplaints}</strong><small>All resident requests</small><div className="portal-kpi-icon"><MessageSquareWarning size={18} /></div></div>
        <div className="portal-kpi green"><span>Resolved</span><strong>{reports.resolvedComplaints}</strong><small>Completed complaints</small><div className="portal-kpi-icon"><CheckCircle2 size={18} /></div></div>
      </div>

      <div className="portal-dashboard-grid">
        <section className="portal-panel">
          <div className="portal-panel-head"><div><h2>Financial Report</h2><p>Collection versus pending dues from maintenance bills.</p></div></div>
          <div className="portal-report-bars">
            <div><span>Total Collection</span><strong>{money(reports.totalCollection)}</strong><i style={{ width: `${collectionWidth}%` }} /></div>
            <div><span>Pending Dues</span><strong>{money(reports.pendingDues)}</strong><i className="orange" style={{ width: `${pendingWidth}%` }} /></div>
            {!bills.length && <div className="portal-empty">No maintenance bills have been generated yet.</div>}
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
        <div className="portal-panel-head"><div><h2>Summary</h2><p>Quick operational snapshot.</p></div><FileBarChart size={16} /></div>
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
