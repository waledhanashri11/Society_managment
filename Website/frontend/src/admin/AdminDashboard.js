import React, { useState, useEffect } from 'react';
import { userAPI, flatAPI, maintenanceAPI, complaintAPI } from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalResidents: 0,
    totalFlats: 0,
    pendingComplaints: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [users, flats, maintenance, complaints] = await Promise.all([
        userAPI.getAll(),
        flatAPI.getAll(),
        maintenanceAPI.getAll(),
        complaintAPI.getAll()
      ]);

      const residents = users.data.filter((u) => u.role === 'resident');
      const paidMaintenance = maintenance.data.filter((m) => m.status === 'paid');
      const pendingComplaints = complaints.data.filter((c) => c.status === 'pending');

      setStats({
        totalResidents: residents.length,
        totalFlats: flats.data.length,
        pendingComplaints: pendingComplaints.length,
        totalRevenue: paidMaintenance.reduce((sum, m) => sum + parseFloat(m.amount), 0)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">Loading...</div>;
  }

  const cards = [
    { title: 'Total Residents', value: stats.totalResidents, icon: '👥', tone: 'bg-cyan-600 text-white' },
    { title: 'Total Flats', value: stats.totalFlats, icon: '🏢', tone: 'bg-emerald-600 text-white' },
    { title: 'Pending Complaints', value: stats.pendingComplaints, icon: '⚠️', tone: 'bg-amber-500 text-slate-950' },
    { title: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: '💰', tone: 'bg-sky-600 text-white' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">A quick overview of your society operations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className={`rounded-2xl p-5 shadow-sm ${card.tone}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm opacity-80">{card.title}</p>
                <p className="mt-2 text-3xl font-semibold">{card.value}</p>
              </div>
              <div className="text-3xl">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Welcome to Society Management System</h3>
        <p className="mt-2 text-sm text-slate-600">Use the sidebar to navigate through different modules.</p>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li><span className="font-semibold text-slate-900">Residents:</span> Manage society residents</li>
          <li><span className="font-semibold text-slate-900">Flats:</span> Manage apartment flats</li>
          <li><span className="font-semibold text-slate-900">Maintenance:</span> Track maintenance payments</li>
          <li><span className="font-semibold text-slate-900">Complaints:</span> Handle resident complaints</li>
          <li><span className="font-semibold text-slate-900">Notices:</span> Publish society notices</li>
          <li><span className="font-semibold text-slate-900">Staff:</span> Manage society staff</li>
          <li><span className="font-semibold text-slate-900">Reports:</span> View detailed reports</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
