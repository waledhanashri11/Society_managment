/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Building2, CalendarDays, CheckCircle2, FileCheck2, Image,
  MessageSquarePlus, MessageSquareWarning, ReceiptIndianRupee, User
} from 'lucide-react';
import { complaintAPI, flatAPI, maintenanceAPI, nocAPI, noticeAPI, residentAPI } from '../services/api';
import { getUser } from '../utils/auth';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';
import { useTranslation } from 'react-i18next';
import { useLocalizedFormatters } from '../utils/formatters';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const monthName = (month) => new Date(2026, Number(month || 1) - 1).toLocaleDateString('en-IN', { month: 'short' });
const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ResidentDashboard = () => {
  const { t } = useTranslation();
  const formatters = useLocalizedFormatters();
  const navigate = useNavigate();
  const user = getUser();
  const [bills, setBills] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notices, setNotices] = useState([]);
  const [flatDetails, setFlatDetails] = useState(null);
  const [nocSummary, setNocSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      maintenanceAPI.getUserMaintenance(),
      complaintAPI.getUserComplaints(),
      noticeAPI.getAll(),
      residentAPI.getDashboard(),
      nocAPI.getSummary()
    ]);
    if (results[0].status === 'fulfilled') setBills(unwrap(results[0].value));
    if (results[1].status === 'fulfilled') setComplaints(unwrap(results[1].value));
    if (results[2].status === 'fulfilled') setNotices(unwrap(results[2].value));
    if (results[4].status === 'fulfilled') setNocSummary(results[4].value.data || {});
    if (results[3].status === 'fulfilled') {
      const dashboardData = results[3].value.data;
      setFlatDetails(dashboardData?.user || null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pendingBills = useMemo(() => bills.filter((bill) => bill.payment_status !== 'Paid'), [bills]);

  const summary = useMemo(() => {
    const paid = bills.filter((bill) => bill.payment_status === 'Paid');
    return {
      due: pendingBills.reduce((sum, bill) => {
        const remaining = bill.remainingPayable !== undefined ? bill.remainingPayable : (bill.remaining_amount !== undefined ? bill.remaining_amount : bill.total_amount);
        return sum + Number(remaining || 0);
      }, 0),
      paid: paid.reduce((sum, bill) => sum + Number(bill.paid_amount || bill.total_amount || 0), 0),
      nextDue: pendingBills[0]?.due_date,
      underReview: bills.filter((bill) => ['Under Review', 'Pending Verification'].includes(bill.payment_status)).length
    };
  }, [bills, pendingBills]);

  const kpis = [
    {
      label: t('dashboard.outstandingDue', 'Outstanding Due'),
      value: formatters.currency(summary.due),
      note: summary.nextDue ? t('dashboard.dueOn', { date: formatters.date(summary.nextDue) }) : t('dashboard.nothingDue', 'All clear'),
      icon: ReceiptIndianRupee,
      tone: summary.due > 0 ? 'orange' : 'green'
    },
    {
      label: t('dashboard.totalPaid', 'Total Paid'),
      value: formatters.currency(summary.paid),
      note: summary.underReview > 0 ? t('dashboard.paymentUnderReview', { count: summary.underReview }) : 'Up to date',
      icon: CheckCircle2,
      tone: 'green'
    },
    {
      label: t('common.flat', 'My Flat'),
      value: flatDetails?.flat_no ? `Flat ${flatDetails.flat_no}` : (user?.flat_no ? `Flat ${user.flat_no}` : 'Assigned'),
      note: flatDetails?.wing ? `Wing ${flatDetails.wing}` : 'Society Resident',
      icon: Building2,
      tone: ''
    },
    {
      label: t('noc.myNocTitle', 'My NOCs'),
      value: `${nocSummary.approved || 0} ${t('noc.approved', 'Approved')}`,
      note: `${nocSummary.pending || 0} ${t('noc.underReview', 'Pending')}`,
      icon: FileCheck2,
      tone: 'green'
    }
  ];

  const quickActions = [
    { label: t('nav.complaints', 'Raise Complaint'), icon: MessageSquarePlus, action: () => navigate('/resident/complaints'), color: '#1473e6', bg: '#eef5ff' },
    { label: t('nav.notices', 'Notices & Polls'), icon: Bell, action: () => navigate('/resident/notices'), color: '#079447', bg: '#eaf8f0' },
    { label: t('dashboard.nocRequests', 'NOC Requests'), icon: FileCheck2, action: () => navigate('/resident/my-nocs'), color: '#7e22ce', bg: '#faf5ff' },
    { label: t('nav.myProfile', 'My Profile'), icon: User, action: () => navigate('/resident/profile'), color: '#dd6b20', bg: '#fff5e9' }
  ];

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div>
          <h1>{t('dashboard.welcomeBack', 'Welcome back')}, {user?.name || t('common.resident', 'Resident')}</h1>
          <p>{t('dashboard.residentSubtitle', 'Your home, payments, and society updates at a glance.')}</p>
        </div>
        <div className="portal-date-chip">
          <CalendarDays size={14} /> {formatters.date(new Date(), { day: undefined, month: 'long', year: 'numeric' })}
        </div>
      </div>

      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="portal-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '12px', marginBottom: '14px' }}>
          {kpis.map(({ label, value, note, icon: Icon, tone }) => (
            <article className={`portal-kpi ${tone}`} key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{note}</small>
              <div className="portal-kpi-icon"><Icon size={16} /></div>
            </article>
          ))}
        </div>
      )}

      {/* Main Dashboard 2-Column Grid */}
      <div className="portal-dashboard-grid">
        {/* Left: Pending Bills & Maintenance */}
        <section className="portal-panel">
          <div className="portal-panel-head">
            <div>
              <h2>{t('dashboard.upcomingBills', 'Maintenance & Bills')}</h2>
              <p>{t('dashboard.upcomingBillsNote', 'Current outstanding and upcoming dues.')}</p>
            </div>
            {summary.due > 0 && (
              <button 
                className="portal-primary-btn" 
                style={{ background: 'linear-gradient(90deg, #087d40, #0ab35c)', padding: '6px 12px', fontSize: '11px' }}
                onClick={() => navigate('/resident/maintenance')}
              >
                {t('dashboard.payNow', 'Pay Now')}
              </button>
            )}
          </div>
          <div className="portal-panel-body" style={{ padding: 0 }}>
            {loading ? (
              <TableSkeleton rows={3} columns={4} />
            ) : pendingBills.length > 0 ? (
              <div className="portal-table-wrap">
                <table className="portal-data-table">
                  <thead>
                    <tr>
                      <th>BILL NO.</th>
                      <th>PERIOD</th>
                      <th>AMOUNT</th>
                      <th>DUE DATE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBills.slice(0, 3).map((bill) => (
                      <tr key={bill.id}>
                        <td><strong>{bill.bill_number || `BILL-${bill.id}`}</strong></td>
                        <td>{monthName(bill.month)} {bill.year}</td>
                        <td><strong>{formatters.currency(bill.remainingPayable || bill.total_amount)}</strong></td>
                        <td>{fullDate(bill.due_date)}</td>
                        <td><span className={`portal-status ${bill.payment_status?.toLowerCase().replace(/\s+/g, '_')}`}>{t(`statusLabel.${bill.payment_status}`, bill.payment_status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="portal-empty" style={{ padding: '28px 14px' }}>
                <CheckCircle2 size={24} style={{ color: '#079447', marginBottom: '6px' }} /><br />
                {t('dashboard.nothingDue', 'All maintenance bills are fully paid. Great job!')}
              </div>
            )}
          </div>
        </section>

        {/* Right: Quick Actions */}
        <section className="portal-panel">
          <div className="portal-panel-head">
            <div>
              <h2>{t('dashboard.quickActions', 'Quick Actions')}</h2>
              <p>{t('dashboard.quickShortcuts', 'Frequently used resident services.')}</p>
            </div>
          </div>
          <div className="portal-panel-body" style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {quickActions.map(({ label, icon: Icon, action, color, bg }) => (
                <button
                  key={label}
                  type="button"
                  onClick={action}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justify: 'center',
                    gap: '8px',
                    padding: '16px 10px',
                    border: '1px solid var(--portal-line, #e2e8f0)',
                    borderRadius: '10px',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.16s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--portal-line, #e2e8f0)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', display: 'grid', placeItems: 'center', color, background: bg }}>
                    <Icon size={18} />
                  </div>
                  <strong style={{ fontSize: '11px', color: '#1e293b', textAlign: 'center' }}>{label}</strong>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Grid: Recent Complaints & Latest Notices */}
      <div className="portal-lists-grid">
        {/* Recent Complaints */}
        <section className="portal-panel">
          <div className="portal-panel-head">
            <div>
              <h2>{t('adminDashboard.recentComplaints', 'Recent Complaints')}</h2>
              <p>{t('adminDashboard.latestResidentRequests', 'Track your recent complaint updates.')}</p>
            </div>
            <button className="portal-link-button" onClick={() => navigate('/resident/complaints')}>
              {t('common.viewAll', 'View All')}
            </button>
          </div>
          <div className="portal-feed">
            {loading ? (
              <TableSkeleton rows={3} columns={3} />
            ) : !complaints.length ? (
              <div className="portal-empty" style={{ padding: '24px 10px', textAlign: 'center', color: '#64748b' }}>
                {t('complaints.noActive', 'No complaints raised yet.')}
              </div>
            ) : (
              complaints.slice(0, 4).map((item) => (
                <div className="portal-feed-item" key={item.id}>
                  <span className="portal-feed-icon"><MessageSquareWarning size={14} /></span>
                  <div className="portal-feed-main">
                    <strong>{item.title}</strong>
                    <span>{fullDate(item.created_at)}</span>
                  </div>
                  <span className={`portal-status ${item.status}`}>{t(`complaintStatus.${item.status}`, item.status)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Latest Notices */}
        <section className="portal-panel">
          <div className="portal-panel-head">
            <div>
              <h2>{t('adminDashboard.recentNotices', 'Latest Notices')}</h2>
              <p>{t('adminDashboard.societyAnnouncements', 'Important society announcements.')}</p>
            </div>
            <button className="portal-link-button" onClick={() => navigate('/resident/notices')}>
              {t('common.viewAll', 'View All')}
            </button>
          </div>
          <div className="portal-feed">
            {loading ? (
              <TableSkeleton rows={3} columns={2} />
            ) : !notices.length ? (
              <div className="portal-empty" style={{ padding: '24px 10px', textAlign: 'center', color: '#64748b' }}>
                {t('notices.noNoticesPublished', 'No notices published yet.')}
              </div>
            ) : (
              notices.slice(0, 4).map((item) => (
                <div className="portal-feed-item" key={item.id}>
                  <span className="portal-feed-icon"><Bell size={14} /></span>
                  <div className="portal-feed-main">
                    <strong>{item.title}</strong>
                    <span>{item.description || 'Society Announcement'}</span>
                  </div>
                  <span className="portal-feed-time">{fullDate(item.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ResidentDashboard;
