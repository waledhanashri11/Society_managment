import React, { useState, useEffect } from 'react';
import { maintenanceAPI, complaintAPI } from '../services/api';

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

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [maintenanceRes, complaintsRes] = await Promise.all([
        maintenanceAPI.getAll(),
        complaintAPI.getAll()
      ]);

      const maintenance = maintenanceRes.data;
      const complaints = complaintsRes.data;

      const paidAmount = maintenance
        .filter((m) => m.status === 'paid')
        .reduce((sum, m) => sum + parseFloat(m.amount), 0);

      const pendingAmount = maintenance
        .filter((m) => m.status === 'pending')
        .reduce((sum, m) => sum + parseFloat(m.amount), 0);

      setReports({
        totalCollection: paidAmount,
        pendingDues: pendingAmount,
        totalComplaints: complaints.length,
        resolvedComplaints: complaints.filter((c) => c.status === 'resolved').length,
        pendingComplaints: complaints.filter((c) => c.status === 'pending').length,
        inProgressComplaints: complaints.filter((c) => c.status === 'in_progress').length
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Reports</h2>
        <p className="mt-1 text-sm text-slate-500">Monitor collections and complaint trends.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Financial Report</h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-slate-500">Total Collection</p>
              <p className="mt-1 text-3xl font-semibold text-emerald-600">₹{reports.totalCollection.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Dues</p>
              <p className="mt-1 text-3xl font-semibold text-amber-600">₹{reports.pendingDues.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Complaint Statistics</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{reports.totalComplaints}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Pending</p>
              <p className="mt-1 text-2xl font-semibold text-amber-600">{reports.pendingComplaints}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="mt-1 text-2xl font-semibold text-sky-600">{reports.inProgressComplaints}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Resolved</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{reports.resolvedComplaints}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-2xl font-semibold text-slate-900">₹{reports.totalCollection.toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-500">Total Revenue</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-2xl font-semibold text-slate-900">₹{reports.pendingDues.toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-500">Pending Collection</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-2xl font-semibold text-slate-900">{reports.resolvedComplaints}/{reports.totalComplaints}</p>
            <p className="mt-1 text-sm text-slate-500">Complaints Resolved</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
