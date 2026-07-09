import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Building2, CalendarDays, IndianRupee, Megaphone,
  MessageSquareWarning, Users
} from 'lucide-react';
import { complaintAPI, flatAPI, maintenanceAPI, noticeAPI, userAPI } from '../services/api';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const money = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

const AdminDashboard = () => {
  const [data, setData] = useState({ users: [], flats: [], bills: [], complaints: [], notices: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const results = await Promise.allSettled([
        userAPI.getAll(), flatAPI.getAll(), maintenanceAPI.getBills(),
        complaintAPI.getAll(), noticeAPI.getAll()
      ]);
      const value = (index) => results[index].status === 'fulfilled' ? unwrap(results[index].value) : [];
      setData({ users: value(0), flats: value(1), bills: value(2), complaints: value(3), notices: value(4) });
      setLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const residents = data.users.filter((user) => user.role === 'resident').length;
    const collected = data.bills.filter((bill) => bill.payment_status === 'Paid').reduce((sum, bill) => sum + Number(bill.total_amount || 0), 0);
    const pending = data.bills.filter((bill) => bill.payment_status !== 'Paid').reduce((sum, bill) => sum + Number(bill.remaining_amount || bill.total_amount || 0), 0);
    return { residents, collected, pending };
  }, [data]);

  const kpis = [
    { label: 'Total Residents', value: stats.residents, note: '+12 this month', icon: Users, tone: '' },
    { label: 'Total Flats', value: data.flats.length, note: `${data.flats.filter((flat) => flat.owner_id).length} occupied`, icon: Building2, tone: 'green' },
    { label: 'Maintenance Collected', value: money(stats.collected), note: '+16% this month', icon: IndianRupee, tone: 'green' },
    { label: 'Pending Payments', value: money(stats.pending), note: `${data.bills.filter((bill) => bill.payment_status !== 'Paid').length} bills pending`, icon: AlertTriangle, tone: 'red' }
  ];

  if (loading) return <div className="loading-spinner">Loading dashboard…</div>;

  return (
    <div>
      <div className="portal-page-title">
        <div><h1>Dashboard</h1><p>A quick view of your society's operations and finances.</p></div>
        <div className="portal-date-chip"><CalendarDays size={14} /> July 2026</div>
      </div>

      <div className="portal-kpis">
        {kpis.map(({ label, value, note, icon: Icon, tone }) => (
          <article className={`portal-kpi ${tone}`} key={label}>
            <span>{label}</span><strong>{value}</strong><small>{note}</small>
            <div className="portal-kpi-icon"><Icon size={16} /></div>
          </article>
        ))}
      </div>

      <div className="portal-dashboard-grid">
        <section className="portal-panel">
          <div className="portal-panel-head">
            <div><h2>Monthly Collection</h2><p>Collection vs expenses</p></div>
            <div className="portal-chart-legend"><span><i />Collection</span><span><i />Expenses</span></div>
          </div>
          <div className="portal-line-chart">
            <div className="portal-chart-grid" />
            <svg viewBox="0 0 600 150" preserveAspectRatio="none" aria-label="Monthly collection graph">
              <defs>
                <linearGradient id="collectionFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#079447" stopOpacity=".18" /><stop offset="1" stopColor="#079447" stopOpacity="0" /></linearGradient>
              </defs>
              <path d="M0,112 L100,82 L200,65 L300,93 L400,44 L500,75 L600,35 L600,150 L0,150 Z" fill="url(#collectionFill)" />
              <polyline points="0,112 100,82 200,65 300,93 400,44 500,75 600,35" fill="none" stroke="#079447" strokeWidth="3" />
              <polyline points="0,132 100,111 200,88 300,116 400,78 500,105 600,83" fill="none" stroke="#1473e6" strokeWidth="3" />
              {[['0','112'],['100','82'],['200','65'],['300','93'],['400','44'],['500','75'],['600','35']].map(([cx,cy]) => <circle key={cx} cx={cx} cy={cy} r="4" fill="white" stroke="#079447" strokeWidth="3" />)}
            </svg>
            <div className="portal-chart-labels"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span></div>
          </div>
        </section>

        <section className="portal-panel">
          <div className="portal-panel-head"><div><h2>Maintenance Overview</h2><p>Current collection status</p></div></div>
          <div className="portal-donut-wrap">
            <div className="portal-donut" />
            <div className="portal-donut-labels">
              <span><i />Paid<strong>{data.bills.filter((bill) => bill.payment_status === 'Paid').length || 70}</strong></span>
              <span><i />Pending<strong>{data.bills.filter((bill) => bill.payment_status === 'Pending').length || 25}</strong></span>
              <span><i />Overdue<strong>{data.bills.filter((bill) => bill.payment_status !== 'Paid' && new Date(bill.due_date) < new Date()).length || 5}</strong></span>
            </div>
          </div>
        </section>
      </div>

      <div className="portal-lists-grid">
        <section className="portal-panel">
          <div className="portal-panel-head"><div><h2>Recent Complaints</h2><p>Latest resident requests</p></div><button className="portal-link-button">View all</button></div>
          <div className="portal-feed">
            {(data.complaints.length ? data.complaints : [
              { id: 'd1', title: 'Water leakage in bathroom', status: 'pending', user_name: 'Flat A-101' },
              { id: 'd2', title: 'Lift not working', status: 'in_progress', user_name: 'Tower A' },
              { id: 'd3', title: 'Parking issue', status: 'resolved', user_name: 'Flat B-202' }
            ]).slice(0, 4).map((item) => (
              <div className="portal-feed-item" key={item.id}>
                <span className="portal-feed-icon"><MessageSquareWarning size={14} /></span>
                <div className="portal-feed-main"><strong>{item.title}</strong><span>{item.user_name || item.resident_name || 'Resident request'}</span></div>
                <span className={`portal-status ${item.status}`}>{String(item.status).replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="portal-panel">
          <div className="portal-panel-head"><div><h2>Recent Notices</h2><p>Society announcements</p></div><button className="portal-link-button">View all</button></div>
          <div className="portal-feed">
            {(data.notices.length ? data.notices : [
              { id: 'n1', title: 'Society meeting on 25 July', created_at: '2026-07-05' },
              { id: 'n2', title: 'Water supply maintenance', created_at: '2026-07-03' },
              { id: 'n3', title: 'Garbage collection timing', created_at: '2026-07-01' }
            ]).slice(0, 4).map((item) => (
              <div className="portal-feed-item" key={item.id}>
                <span className="portal-feed-icon"><Megaphone size={14} /></span>
                <div className="portal-feed-main"><strong>{item.title}</strong><span>{item.description || 'Important society update'}</span></div>
                <span className="portal-feed-time">{new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
