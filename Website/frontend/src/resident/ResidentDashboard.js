import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Building2, Car, Download, Eye, FileCheck2, FileText, MessageSquarePlus,
  MessageSquareWarning, ReceiptIndianRupee, History, Calendar, Printer
} from 'lucide-react';
import { complaintAPI, maintenanceAPI, noticeAPI, residentAPI, settingsAPI, flatAPI, nocAPI } from '../services/api';
import { getUser } from '../utils/auth';
import { downloadPaymentReceiptPdf, printPaymentReceipt, receiptAvailable, printWriteOffReceipt, downloadWriteOffReceiptPdf } from '../utils/paymentReceipt';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';
import { useTranslation } from 'react-i18next';
import { useLocalizedFormatters } from '../utils/formatters';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const money = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;
const monthName = (month) => new Date(2026, Number(month || 1) - 1).toLocaleDateString('en-IN', { month: 'short' });
const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const getProfilePhotoKey = (user) => `residentProfilePhoto:${user?.id || user?.email || 'current'}`;


const ResidentDashboard = () => {
  const { t } = useTranslation();
  const formatters = useLocalizedFormatters();
  const navigate = useNavigate();
  const user = getUser();
  const profilePhotoKey = getProfilePhotoKey(user);
  const [bills, setBills] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notices, setNotices] = useState([]);
  const [flatDetails, setFlatDetails] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [flatMaintenanceHistory, setFlatMaintenanceHistory] = useState([]);
  const [nocSummary, setNocSummary] = useState({});
  const [paymentSettings, setPaymentSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [showComplaint, setShowComplaint] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem(profilePhotoKey) || '');
  const [complaint, setComplaint] = useState({ title: '', description: '' });

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const load = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      maintenanceAPI.getUserMaintenance(),
      complaintAPI.getUserComplaints(),
      noticeAPI.getAll(),
      settingsAPI.getPayment(),
      residentAPI.getDashboard(),
      nocAPI.getSummary()
    ]);
    if (results[0].status === 'fulfilled') setBills(unwrap(results[0].value));
    if (results[1].status === 'fulfilled') setComplaints(unwrap(results[1].value));
    if (results[2].status === 'fulfilled') setNotices(unwrap(results[2].value));
    if (results[3].status === 'fulfilled') setPaymentSettings(results[3].value.data?.data ?? results[3].value.data ?? {});
    if (results[5].status === 'fulfilled') setNocSummary(results[5].value.data || {});
    if (results[4].status === 'fulfilled') {
      const dashboardData = results[4].value.data;
      const residentUser = dashboardData?.user || null;
      setFlatDetails(residentUser);

      const flatId = residentUser?.flat_id || user?.flat_id;
      if (flatId) {
        try {
          const [transfersRes, maintHistRes] = await Promise.all([
            flatAPI.getTransfers(flatId),
            flatAPI.getMaintenanceHistory(flatId)
          ]);
          setTransfers(transfersRes.data || []);
          
          // Filter flat maintenance history to only show previous residents' bills
          // (i.e. where resident_id is different from current user id)
          const currentUserId = residentUser?.id || user?.id;
          const prevMaint = (maintHistRes.data || []).filter(
            (item) => Number(item.resident_id) !== Number(currentUserId)
          );
          setFlatMaintenanceHistory(prevMaint);
        } catch (error) {
          console.error('Error fetching flat history:', error);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const refreshPhoto = (event) => {
      if (event.detail?.key && event.detail.key !== profilePhotoKey) return;
      setProfilePhoto(localStorage.getItem(profilePhotoKey) || '');
    };

    window.addEventListener('residentProfilePhotoUpdated', refreshPhoto);
    window.addEventListener('storage', refreshPhoto);
    return () => {
      window.removeEventListener('residentProfilePhotoUpdated', refreshPhoto);
      window.removeEventListener('storage', refreshPhoto);
    };
  }, [profilePhotoKey]);

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

  const submitComplaint = async (event) => {
    event.preventDefault();
    await complaintAPI.create(complaint);
    setComplaint({ title: '', description: '' });
    setShowComplaint(false);
    notify('Complaint submitted');
    load();
  };

  const printDocument = (type, bill) => {
    const itemsHtml = bill.items && bill.items.length > 0
      ? bill.items.map(item => `<tr><th>${item.name}</th><td>${money(item.amount)}</td></tr>`).join('')
      : '';
      
    const prevOutstandingHtml = Number(bill.previous_outstanding || 0) > 0
      ? `<tr><th>Previous Outstanding</th><td>${money(bill.previous_outstanding)}</td></tr>`
      : '';

    const html = `
      <html><head><title>${type}</title><style>
      body{font-family:Arial,sans-serif;padding:32px;color:#172033}.box{max-width:760px;margin:0 auto;border:1px solid #1c6adf;border-radius:14px;padding:28px}
      h1{margin:0;font-size:26px}.muted{color:#667085;margin-top:6px}table{width:100%;border-collapse:collapse;margin-top:24px}
      td,th{border-bottom:1px solid #0f78e0;padding:12px;text-align:left}.total{font-size:22px;font-weight:800}.right{text-align:right}
      </style></head><body><div class="box">
      <h1>${type}</h1><div class="muted">Society Management System</div>
      <table>
      <tr><th>Bill No.</th><td>${bill.bill_number || `BILL-${bill.id}`}</td></tr>
      <tr><th>Resident</th><td>${user?.name || 'Resident'}</td></tr>
      <tr><th>Flat</th><td>${bill.flat_no || ''}</td></tr>
      <tr><th>Period</th><td>${monthName(bill.month)} ${bill.year || ''}</td></tr>
      <tr><th>Due Date</th><td>${fullDate(bill.due_date)}</td></tr>
      <tr><th>Status</th><td>${bill.payment_status}</td></tr>
      <tr><th>Base Maintenance Charge</th><td>${money(bill.amount)}</td></tr>
      ${itemsHtml}
      <tr><th>Late Fee</th><td>${money(bill.late_fee || bill.penalty_amount)}</td></tr>
      ${prevOutstandingHtml}
      <tr><th class="total">Total Payable</th><td class="total">${money(Number(bill.total_amount || 0) + Number(bill.previous_outstanding || 0))}</td></tr>
      </table><p class="muted right">Generated on ${new Date().toLocaleString('en-IN')}</p>
      </div><script>window.print();</script></body></html>`;
    const docWindow = window.open('', '_blank', 'width=900,height=700');
    if (!docWindow) return notify('Popup blocked. Allow popups to print.');
    docWindow.document.write(html);
    docWindow.document.close();
  };

  const handlePrint = async (type, bill) => {
    try {
      const response = await maintenanceAPI.getBillById(bill.id);
      const fullBill = response.data?.data?.bill || response.data?.bill || bill;
      printDocument(type, fullBill);
    } catch (err) {
      notify('Failed to load bill details for printing');
    }
  };

  const getReceipt = async (bill) => {
    if (!bill.payment_id) throw new Error('Receipt payment is unavailable');
    const response = await maintenanceAPI.getPaymentReceipt(bill.payment_id);
    return response.data?.data ?? response.data;
  };

  const handlePrintReceipt = async (bill) => {
    try {
      printPaymentReceipt(await getReceipt(bill), paymentSettings);
    } catch (error) {
      notify(error.message === 'Popup blocked' ? 'Popup blocked. Allow popups to print.' : 'Could not load receipt details');
    }
  };

  const handleDownloadReceipt = async (bill) => {
    try {
      await downloadPaymentReceiptPdf(await getReceipt(bill), paymentSettings);
    } catch (error) {
      notify('Could not download the receipt PDF');
    }
  };

  const handlePrintWriteOffReceipt = async (bill) => {
    try {
      const response = await maintenanceAPI.getWriteOffReceipt(bill.id);
      const receiptData = response.data?.data || response.data || {};
      printWriteOffReceipt(receiptData, paymentSettings);
    } catch (error) {
      notify(error.message === 'Popup blocked' ? 'Popup blocked. Allow popups to print.' : 'Could not print the write-off receipt');
    }
  };

  const handleDownloadWriteOffReceipt = async (bill) => {
    try {
      const response = await maintenanceAPI.getWriteOffReceipt(bill.id);
      const receiptData = response.data?.data || response.data || {};
      await downloadWriteOffReceiptPdf(receiptData, paymentSettings);
    } catch (error) {
      notify('Could not download the write-off receipt PDF');
    }
  };



  const quickActions = [
    { label: t('nav.complaints'), icon: MessageSquarePlus, action: () => navigate('/resident/complaints') },
    { label: t('nav.notices'), icon: Bell, action: () => navigate('/resident/notices') },
    { label: t('dashboard.nocRequests'), icon: FileCheck2, action: () => navigate('/resident/noc-requests') },
    { label: t('dashboard.myVehicles'), icon: Car, action: () => navigate('/resident/profile') }
  ];

  return (
    <div>
      {toast && <div className="resident-toast">{toast}</div>}
      <div className="portal-page-title">
        <div><h1>{t('dashboard.title')}</h1><p>{t('dashboard.residentSubtitle')}</p></div>
      </div>

      <section className="resident-welcome">
        {loading ? (
          <CardSkeleton count={3} />
        ) : (
          <>
            <div className="resident-identity flex items-center gap-3 min-h-[92px]">
              <span className={`resident-avatar ${profilePhoto ? 'has-photo' : ''}`}>
                {profilePhoto ? <img src={profilePhoto} alt="Resident profile" loading="lazy" decoding="async" /> : (user?.name || 'R').charAt(0)}
              </span>
              <div>
                <small className="block opacity-85 text-[10px]">{t('dashboard.welcomeBack')}</small>
                <strong className="block text-base font-black leading-tight mt-0.5">{user?.name || t('common.resident')}</strong>
                <span className="block opacity-75 text-[9px] mt-1">{t('dashboard.residentAccount')}</span>
              </div>
            </div>

            <div 
              className="resident-balance cursor-pointer hover:bg-slate-50/50 hover:shadow-sm transition-all duration-200 flex flex-col justify-center min-h-[92px]" 
              onClick={() => navigate('/resident/maintenance')}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{t('dashboard.outstandingDue')}</span>
              <strong className="text-xl font-black text-slate-950 mt-1">{formatters.currency(summary.due)}</strong>
              <small className="text-[10px] text-slate-500 font-semibold mt-1">
                {summary.nextDue ? t('dashboard.dueOn', { date: formatters.date(summary.nextDue) }) : t('dashboard.nothingDue')}
              </small>
            </div>

            <div className="resident-balance flex flex-col justify-center min-h-[92px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{t('dashboard.totalPaid')}</span>
              <strong className="text-xl font-black text-slate-950 mt-1">{formatters.currency(summary.paid)}</strong>
              <small className="text-[10px] text-slate-500 font-semibold mt-1">
                {t('dashboard.paymentUnderReview', { count: summary.underReview })}
              </small>
            </div>
          </>
        )}
      </section>

      {!loading && pendingBills.length > 0 && (
        <section className="portal-panel mb-4">
          <div className="portal-panel-head">
            <div>
              <h2>{t('dashboard.upcomingBills')}</h2>
              <p>{t('dashboard.upcomingBillsNote')}</p>
            </div>
            <button className="resident-pay" onClick={() => navigate('/resident/maintenance')}>{t('dashboard.payNow')}</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 p-4">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-2">{t('dashboard.pendingBills')}</span>
              <div className="grid gap-2">
                {pendingBills.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-800">{monthName(bill.month)} {bill.year}</span>
                    <span className={`portal-status ${String(bill.payment_status).toLowerCase().replace(' ', '_')}`}>{bill.payment_status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-4 min-w-[180px]">
              <span className="block text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">{t('dashboard.outstandingDue')}</span>
              <strong className="block mt-2 text-2xl font-black text-emerald-950">{formatters.currency(summary.due)}</strong>
              <button className="resident-pay mt-3 w-full" onClick={() => navigate('/resident/maintenance')}>{t('dashboard.payNow')}</button>
            </div>
          </div>
        </section>
      )}

      <div className="portal-dashboard-grid">
        <section className="portal-panel flex flex-col justify-between">
          <div className="portal-panel-head">
            <div>
              <h2>{t('dashboard.quickActions')}</h2>
              <p>{t('dashboard.quickActionsNote')}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 p-5 my-auto">
            {quickActions.map(({ label, icon: Icon, action }) => (
              <button 
                className="flex flex-col items-center gap-2 border-0 bg-transparent text-slate-700 hover:text-emerald-700 hover:scale-105 transition-all duration-200 text-center cursor-pointer group" 
                key={label} 
                onClick={action}
              >
                <span className="w-11 h-11 grid place-items-center rounded-2xl text-emerald-700 bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                  <Icon size={20} />
                </span>
                <span className="text-[10px] font-bold leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="portal-panel flex flex-col justify-between">
          <div className="portal-panel-head">
            <div>
              <h2>{t('dashboard.myFlat')}</h2>
              <p>{t('dashboard.assignedResidence')}</p>
            </div>
            <Building2 size={17} className="text-slate-400" />
          </div>
          {loading ? (
            <div className="p-5 my-auto"><CardSkeleton count={2} /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-5 my-auto">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-500">{t('common.flat')}</span>
                <strong className="mt-1 block text-sm font-black text-slate-950">Flat {flatDetails?.flat_no || 'N/A'}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-500">{t('dashboard.wing')}</span>
                <strong className="mt-1 block text-sm font-black text-slate-950">{flatDetails?.wing || '-'}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-500">{t('common.floor')}</span>
                <strong className="mt-1 block text-sm font-black text-slate-950">{flatDetails?.floor_no ?? '-'}</strong>
              </div>
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3">
                <span className="block text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">{t('common.status')}</span>
                <strong className="mt-1 block text-sm font-black text-emerald-900">{flatDetails?.flat_status || t('dashboard.assigned')}</strong>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="portal-panel resident-summary-panel">
        <div className="portal-panel-head">
          <div>
            <h2>{t('dashboard.residentSummary')}</h2>
            <p>{t('dashboard.residentSummaryNote')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/80 text-center">
            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{t('nav.complaints')}</span>
            <strong className="block mt-1.5 text-xl font-black text-slate-950">{complaints.length}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/80 text-center">
            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{t('nav.notices')}</span>
            <strong className="block mt-1.5 text-xl font-black text-slate-950">{notices.length}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/80 text-center">
            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{t('dashboard.pendingBills')}</span>
            <strong className="block mt-1.5 text-xl font-black text-slate-950">{pendingBills.length}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/80 text-center">
            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{t('dashboard.pendingRequests')}</span>
            <strong className="block mt-1.5 text-xl font-black text-slate-950">{Number(nocSummary.pending || 0) + Number(nocSummary.under_review || 0)}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/80 text-center">
            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{t('dashboard.approvedNocs')}</span>
            <strong className="block mt-1.5 text-xl font-black text-slate-950">{Number(nocSummary.approved || 0)}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/80 text-center">
            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{t('dashboard.rejectedRequests')}</span>
            <strong className="block mt-1.5 text-xl font-black text-slate-950">{Number(nocSummary.rejected || 0)}</strong>
          </div>
        </div>
      </section>

      <section className="portal-panel resident-maintenance-panel" id="maintenance">
          <div className="portal-panel-head">
            <div><h2>{t('dashboard.maintenancePreview')}</h2><p>{t('dashboard.maintenancePreviewNote')}</p></div>
            <button className="resident-pay" onClick={() => navigate('/resident/maintenance')}>{t('dashboard.viewAll')}</button>
          </div>
          {loading ? (
            <TableSkeleton rows={3} columns={4} />
          ) : bills.length ? (
            <div style={{ overflowX: 'auto' }}><table className="resident-payments">
              <thead><tr><th>{t('dashboard.month')}</th><th>{t('common.amount')}</th><th>{t('common.status')}</th><th>{t('common.actions')}</th></tr></thead>
              <tbody>{bills.slice(0, 3).map((bill) => (
                <tr key={bill.id}>
                  <td><strong>{monthName(bill.month)} {bill.year}</strong><small>{bill.bill_number || `BILL-${bill.id}`}</small></td>
                  <td>
                    <strong>{money(bill.remainingPayable !== undefined ? bill.remainingPayable : (bill.remaining_amount !== undefined ? bill.remaining_amount : bill.total_amount))}</strong>
                    {Number(bill.write_off_amount || 0) > 0 && (
                      <div style={{ fontSize: '10px', color: '#b91c1c', fontWeight: '500' }}>Original: {money(bill.total_amount)}</div>
                    )}
                  </td>
                  <td>
                    <span style={{ 
                      borderRadius: '99px', 
                      padding: '2px 6px', 
                      fontSize: '9px', 
                      fontWeight: '700',
                      color: bill.payment_status === 'Paid' ? '#05783b' : (bill.payment_status === 'Overdue' ? '#b42318' : '#bd5b00'),
                      background: bill.payment_status === 'Paid' ? '#e8f8ef' : (bill.payment_status === 'Overdue' ? '#fef3f2' : '#fff2e5'),
                      display: 'inline-block',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      verticalAlign: 'middle'
                    }}>
                      {bill.write_off_status || bill.payment_status}
                    </span>
                  </td>
                  <td>
                    <div className="resident-bill-actions">
                      {bill.payment_status === 'Paid' ? (
                        <>
                          <button onClick={() => handlePrint('Maintenance Invoice', bill)}><FileText size={11} /> Invoice</button>
                          {receiptAvailable(bill.payment_status) && (
                            <>
                              <button onClick={() => handlePrintReceipt(bill)}><Printer size={11} /> Print Receipt</button>
                              <button className="blue-btn" onClick={() => handleDownloadReceipt(bill)}><Download size={11} /> Download PDF</button>
                            </>
                          )}
                          {Number(bill.write_off_amount) > 0 && (
                            <>
                              <button onClick={() => handlePrintWriteOffReceipt(bill)}><Printer size={11} /> Print W/O</button>
                              <button className="blue-btn" onClick={() => handleDownloadWriteOffReceipt(bill)}><Download size={11} /> W/O PDF</button>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <button onClick={() => navigate('/resident/maintenance')}><Eye size={11} /> View</button>
                          {Number(bill.write_off_amount) > 0 && (
                            <>
                              <button onClick={() => handlePrintWriteOffReceipt(bill)}><Printer size={11} /> Print W/O</button>
                              <button className="blue-btn" onClick={() => handleDownloadWriteOffReceipt(bill)}><Download size={11} /> W/O PDF</button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <div className="portal-empty"><ReceiptIndianRupee size={23} /><br />No maintenance bills have been issued yet.</div>}
      </section>

      {flatDetails?.flat_id && (
        <div className="portal-dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px', marginBottom: '20px' }}>
          <section className="portal-panel">
            <div className="portal-panel-head">
              <div>
                <h2>Flat Transfer History</h2>
                <p>Ownership transfer timeline for this flat</p>
              </div>
              <History size={17} style={{ color: '#2563eb' }} />
            </div>
            <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
              {transfers.map((t) => (
                <div key={t.id} style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                    <span>Flat Transferred</span>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      {new Date(t.transfer_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {t.transfer_reason && (
                    <div style={{ color: '#475569', fontStyle: 'italic', marginTop: '4px' }}>
                      Reason: {t.transfer_reason}
                    </div>
                  )}
                </div>
              ))}
              {!transfers.length && (
                <div className="portal-empty" style={{ padding: '20px' }}>
                  No transfers recorded for this flat.
                </div>
              )}
            </div>
          </section>

          <section className="portal-panel">
            <div className="portal-panel-head">
              <div>
                <h2>Previous Flat Maintenance</h2>
                <p>Billing history from previous residents</p>
              </div>
              <ReceiptIndianRupee size={17} style={{ color: '#059669' }} />
            </div>
            <div className="p-4" style={{ overflowX: 'auto', maxHeight: '250px', overflowY: 'auto' }}>
              {flatMaintenanceHistory.length ? (
                <table className="resident-payments" style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Payment Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatMaintenanceHistory.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{monthName(item.month)} {item.year}</strong></td>
                        <td>{money(item.total_amount)}</td>
                        <td>
                          <span className={`portal-status ${String(item.status).toLowerCase().replace(' ', '_')}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>{item.payment_date ? fullDate(item.payment_date) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="portal-empty" style={{ padding: '20px' }}>
                  No previous maintenance history for this flat.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <div className="resident-bottom-grid">
        <section className="portal-panel">
          <div className="portal-panel-head">
            <div><h2>Recent Complaints</h2><p>Latest requests from your account</p></div>
            <button className="resident-pay" onClick={() => navigate('/resident/complaints')}>View All</button>
          </div>
          <div className="portal-feed">
            {loading ? <TableSkeleton rows={3} columns={3} /> : complaints.slice(0, 3).map((item) => (
              <div className="portal-feed-item" key={item.id}>
                <span className="portal-feed-icon"><MessageSquareWarning size={14} /></span>
                <div className="portal-feed-main"><strong>{item.title}</strong><span>{fullDate(item.created_at)}</span></div>
                <span className={`portal-status ${item.status}`}>{String(item.status).replace('_', ' ')}</span>
              </div>
            ))}
            {!loading && !complaints.length && <div className="portal-empty">No complaints raised yet.</div>}
          </div>
        </section>

        <section className="portal-panel">
          <div className="portal-panel-head">
            <div><h2>Latest Notices</h2><p>Recent society announcements</p></div>
            <button className="resident-pay" onClick={() => navigate('/resident/notices')}>View All</button>
          </div>
          <div className="resident-notice-list">
            {loading ? <TableSkeleton rows={3} columns={2} /> : notices.slice(0, 3).map((item) => (
              <div className="resident-notice-item" key={item.id}>
                <span className="resident-notice-icon"><Bell size={14} /></span>
                <div className="resident-notice-main">
                  <div>
                    <strong>{item.title}</strong>
                    <time>{fullDate(item.created_at)}</time>
                  </div>
                  {item.description && <p>{item.description}</p>}
                </div>
              </div>
            ))}
            {!loading && !notices.length && <div className="portal-empty">No notices yet.</div>}
          </div>
        </section>
      </div>



      {showComplaint && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowComplaint(false)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <form onSubmit={submitComplaint} style={{ display: 'flex', flexDirection: 'column', maxHeight: '92vh', margin: 0 }}>
              <div className="portal-modal-head">
                <div>
                  <h3>Raise a complaint</h3>
                  <p>Tell the society team what needs attention.</p>
                </div>
              </div>
              <div className="portal-form" style={{ overflowY: 'auto', flex: '1 1 auto', display: 'grid', gap: '13px', padding: '18px 20px 20px' }}>
                <label className="portal-field-full"><span>Subject</span><input required value={complaint.title} onChange={(e) => setComplaint({ ...complaint, title: e.target.value })} /></label>
                <label className="portal-field-full"><span>Description</span><textarea required rows="4" value={complaint.description} onChange={(e) => setComplaint({ ...complaint, description: e.target.value })} /></label>
              </div>
              <div className="portal-form-actions" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end', gap: '9px', padding: '15px 20px', borderTop: '1px solid var(--portal-line)', background: '#fdfdfd', borderBottomLeftRadius: '14px', borderBottomRightRadius: '14px' }}>
                <button type="button" className="portal-light-btn" onClick={() => setShowComplaint(false)}>Cancel</button>
                <button className="portal-primary-btn">Submit Complaint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentDashboard;
