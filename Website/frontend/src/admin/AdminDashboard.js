import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Building2, CalendarDays, FileCheck2, IndianRupee, Megaphone,
  MessageSquareWarning, Users
} from 'lucide-react';
import { complaintAPI, flatAPI, maintenanceAPI, nocAPI, noticeAPI, userAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const money = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ users: [], flats: [], bills: [], complaints: [], notices: [], expenses: [], nocSummary: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const results = await Promise.allSettled([
        userAPI.getAll(), flatAPI.getAll(), maintenanceAPI.getBills(),
        complaintAPI.getAll(), noticeAPI.getAll(), maintenanceAPI.getExpenses(), nocAPI.getSummary()
      ]);
      const value = (index) => results[index].status === 'fulfilled' ? unwrap(results[index].value) : [];
      setData({
        users: value(0),
        flats: value(1),
        bills: value(2),
        complaints: value(3),
        notices: value(4),
        expenses: value(5),
        nocSummary: results[6].status === 'fulfilled' ? (results[6].value.data || {}) : {}
      });
      setLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const residents = data.users.filter((user) => user.role === 'resident').length;
    const collected = data.bills.filter((bill) => (bill.payment_status || bill.status) === 'Paid').reduce((sum, bill) => sum + Number(bill.total_amount || 0), 0);
    const pending = data.bills.filter((bill) => (bill.payment_status || bill.status) !== 'Paid').reduce((sum, bill) => sum + Number(bill.remaining_amount || bill.total_amount || 0), 0);
    return { residents, collected, pending };
  }, [data]);

  const kpis = [
    { label: 'Total Residents', value: stats.residents, note: 'Approved resident accounts', icon: Users, tone: '' },
    { label: 'Total Flats', value: data.flats.length, note: `${data.flats.filter((flat) => flat.owner_id).length} occupied`, icon: Building2, tone: 'green' },
    { label: 'Maintenance Collected', value: money(stats.collected), note: `From all maintenance bills`, icon: IndianRupee, tone: 'green' },
    { label: 'Pending Payments', value: money(stats.pending), note: `${data.bills.filter((bill) => (bill.payment_status || bill.status) !== 'Paid').length} bills pending`, icon: AlertTriangle, tone: 'red' },
    { label: 'Pending NOCs', value: Number(data.nocSummary.pending || 0), note: `${Number(data.nocSummary.total || 0)} total requests`, icon: FileCheck2, tone: '' },
    { label: 'Approved NOCs', value: Number(data.nocSummary.approved || 0), note: `${Number(data.nocSummary.rejected || 0)} rejected requests`, icon: FileCheck2, tone: 'green' }
  ];

  const trendData = useMemo(() => {
    const monthsList = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthsList.push({
        name: d.toLocaleDateString('en-IN', { month: 'short' }),
        year: d.getFullYear(),
        monthNum: d.getMonth() + 1,
        collected: 0,
        expense: 0
      });
    }

    // Group bills collected by month
    data.bills.forEach((bill) => {
      const match = monthsList.find(m => Number(m.monthNum) === Number(bill.month) && Number(m.year) === Number(bill.year));
      if (match) {
        match.collected += Number(bill.paid_amount || 0);
      }
    });

    // Group expenses by month
    if (data.expenses) {
      data.expenses.forEach((exp) => {
        const date = new Date(exp.expense_date);
        const match = monthsList.find(m => Number(m.monthNum) === (date.getMonth() + 1) && Number(m.year) === date.getFullYear());
        if (match) {
          match.expense += Number(exp.amount || 0);
        }
      });
    }

    return monthsList;
  }, [data]);

  const chartPaths = useMemo(() => {
    const maxVal = Math.max(...trendData.map(d => Math.max(d.collected, d.expense)), 1000);
    const pointsCollection = trendData.map((d, i) => `${i * 120},${130 - (d.collected / maxVal) * 100}`);
    const pointsExpense = trendData.map((d, i) => `${i * 120},${130 - (d.expense / maxVal) * 100}`);
    
    return {
      fill: `M0,150 L${pointsCollection.join(' L')} L600,150 Z`,
      collectionLine: pointsCollection.join(' '),
      expenseLine: pointsExpense.join(' '),
      points: pointsCollection.map(p => p.split(','))
    };
  }, [trendData]);

  const donutPercentages = useMemo(() => {
    const total = data.bills.length;
    if (total === 0) {
      return { paidPct: 100, pendingPct: 0, overduePct: 0, paid: 0, pending: 0, overdue: 0 };
    }
    const paid = data.bills.filter((bill) => (bill.payment_status || bill.status) === 'Paid').length;
    const pending = data.bills.filter((bill) => (bill.payment_status || bill.status) === 'Pending').length;
    const overdue = data.bills.filter((bill) => (bill.payment_status || bill.status) === 'Overdue').length;

    const paidPct = Math.round((paid / total) * 100);
    const pendingPct = Math.round((pending / total) * 100);
    const overduePct = 100 - paidPct - pendingPct;

    return { paidPct, pendingPct, overduePct, paid, pending, overdue };
  }, [data]);

  return (
    <div>
      <div className="portal-page-title">
        <div><h1>Dashboard</h1><p>A quick view of your society's operations and finances.</p></div>
        <div className="portal-date-chip"><CalendarDays size={14} /> {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
      </div>

      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="portal-kpis">
        {kpis.map(({ label, value, note, icon: Icon, tone }) => (
          <article className={`portal-kpi ${tone}`} key={label}>
            <span>{label}</span><strong>{value}</strong><small>{note}</small>
            <div className="portal-kpi-icon"><Icon size={16} /></div>
          </article>
        ))}
        </div>
      )}

      <div className="portal-dashboard-grid">
        <section className="portal-panel">
          <div className="portal-panel-head">
            <div><h2>Monthly Collection</h2><p>Collection vs expenses</p></div>
            <div className="portal-chart-legend"><span><i />Collection</span><span><i style={{ backgroundColor: '#1473e6' }} />Expenses</span></div>
          </div>
          {loading ? <TableSkeleton rows={4} columns={3} /> : <div className="portal-line-chart">
            <div className="portal-chart-grid" />
            <svg viewBox="0 0 600 150" preserveAspectRatio="none" aria-label="Monthly collection graph">
              <defs>
                <linearGradient id="collectionFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#079447" stopOpacity=".18" /><stop offset="1" stopColor="#079447" stopOpacity="0" /></linearGradient>
              </defs>
              <path d={chartPaths.fill} fill="url(#collectionFill)" />
              <polyline points={chartPaths.collectionLine} fill="none" stroke="#079447" strokeWidth="3" />
              <polyline points={chartPaths.expenseLine} fill="none" stroke="#1473e6" strokeWidth="3" />
              {chartPaths.points.map(([cx, cy], idx) => <circle key={idx} cx={cx} cy={cy} r="4" fill="white" stroke="#079447" strokeWidth="3" />)}
            </svg>
            <div className="portal-chart-labels">
              {trendData.map(d => <span key={`${d.name}-${d.year}`}>{d.name}</span>)}
            </div>
          </div>}
        </section>

        <section className="portal-panel">
          <div className="portal-panel-head"><div><h2>Maintenance Overview</h2><p>Current collection status</p></div></div>
          {loading ? <CardSkeleton count={1} /> : <div className="portal-donut-wrap">
            <div 
              className="portal-donut" 
              style={{ 
                background: `conic-gradient(#079447 0% ${donutPercentages.paidPct}%, #f59e0b ${donutPercentages.paidPct}% ${donutPercentages.paidPct + donutPercentages.pendingPct}%, #ef4444 ${donutPercentages.paidPct + donutPercentages.pendingPct}% 100%)` 
              }}
            />
            <div className="portal-donut-labels">
              <span><i />Paid<strong>{donutPercentages.paid}</strong></span>
              <span><i />Pending<strong>{donutPercentages.pending}</strong></span>
              <span><i />Overdue<strong>{donutPercentages.overdue}</strong></span>
            </div>
          </div>}
        </section>
      </div>

      <div className="portal-lists-grid">
        <section className="portal-panel">
          <div className="portal-panel-head"><div><h2>Recent Complaints</h2><p>Latest resident requests</p></div><button className="portal-link-button" onClick={() => navigate('/admin/complaints')}>View all</button></div>
          <div className="portal-feed">
            {loading ? <TableSkeleton rows={4} columns={3} /> : (
              !data.complaints.length ? (
                <div className="portal-empty" style={{ padding: '24px 10px', textAlign: 'center', color: '#64748b' }}>No complaints found.</div>
              ) : (
                data.complaints.slice(0, 4).map((item) => (
                  <div className="portal-feed-item" key={item.id}>
                    <span className="portal-feed-icon"><MessageSquareWarning size={14} /></span>
                    <div className="portal-feed-main"><strong>{item.title}</strong><span>{item.user_name || item.resident_name || 'Resident request'}</span></div>
                    <span className={`portal-status ${item.status}`}>{String(item.status).replace('_', ' ')}</span>
                  </div>
                ))
              )
            )}
          </div>
        </section>

        <section className="portal-panel">
          <div className="portal-panel-head"><div><h2>Recent Notices</h2><p>Society announcements</p></div><button className="portal-link-button" onClick={() => navigate('/admin/notices')}>View all</button></div>
          <div className="portal-feed">
            {loading ? <TableSkeleton rows={4} columns={2} /> : (
              !data.notices.length ? (
                <div className="portal-empty" style={{ padding: '24px 10px', textAlign: 'center', color: '#64748b' }}>No notices available.</div>
              ) : (
                data.notices.slice(0, 4).map((item) => (
                  <div className="portal-feed-item" key={item.id}>
                    <span className="portal-feed-icon"><Megaphone size={14} /></span>
                    <div className="portal-feed-main"><strong>{item.title}</strong><span>{item.description || 'Important society update'}</span></div>
                    <span className="portal-feed-time">{new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  </div>
                ))
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
