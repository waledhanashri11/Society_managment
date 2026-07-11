import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Building2, Car, CreditCard, Download, FileText, MessageSquarePlus,
  MessageSquareWarning, QrCode, ReceiptIndianRupee, Send
} from 'lucide-react';
import { complaintAPI, maintenanceAPI, noticeAPI, residentAPI, settingsAPI } from '../services/api';
import { getUser } from '../utils/auth';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const money = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;
const monthName = (month) => new Date(2026, Number(month || 1) - 1).toLocaleDateString('en-IN', { month: 'short' });
const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const getProfilePhotoKey = (user) => `residentProfilePhoto:${user?.id || user?.email || 'current'}`;

const ResidentDashboard = () => {
  const navigate = useNavigate();
  const user = getUser();
  const profilePhotoKey = getProfilePhotoKey(user);
  const [bills, setBills] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notices, setNotices] = useState([]);
  const [flatDetails, setFlatDetails] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [showComplaint, setShowComplaint] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem(profilePhotoKey) || '');
  const [complaint, setComplaint] = useState({ title: '', description: '' });
  const [payment, setPayment] = useState({ paymentMethod: 'UPI', transactionId: '', amount: '', screenshotUrl: '' });

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const load = async () => {
    const results = await Promise.allSettled([
      maintenanceAPI.getUserMaintenance(),
      complaintAPI.getUserComplaints(),
      noticeAPI.getAll(),
      settingsAPI.getPayment(),
      residentAPI.getDashboard()
    ]);
    if (results[0].status === 'fulfilled') setBills(unwrap(results[0].value));
    if (results[1].status === 'fulfilled') setComplaints(unwrap(results[1].value));
    if (results[2].status === 'fulfilled') setNotices(unwrap(results[2].value));
    if (results[3].status === 'fulfilled') setPaymentSettings(results[3].value.data || {});
    if (results[4].status === 'fulfilled') setFlatDetails(results[4].value.data?.user || null);
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
  const latestDueBill = pendingBills[0];

  const summary = useMemo(() => {
    const paid = bills.filter((bill) => bill.payment_status === 'Paid');
    return {
      due: pendingBills.reduce((sum, bill) => sum + Number(bill.remaining_amount || bill.total_amount || 0), 0),
      paid: paid.reduce((sum, bill) => sum + Number(bill.paid_amount || bill.total_amount || 0), 0),
      nextDue: pendingBills[0]?.due_date,
      underReview: bills.filter((bill) => bill.payment_status === 'Under Review').length
    };
  }, [bills, pendingBills]);

  const openPayment = (bill = latestDueBill) => {
    if (!bill) {
      notify('No pending bill to pay');
      return;
    }
    setSelectedBill(bill);
    setPayment({
      paymentMethod: 'UPI',
      transactionId: '',
      amount: String(bill.remaining_amount || bill.total_amount || ''),
      screenshotUrl: ''
    });
    setShowPayment(true);
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!selectedBill) return;
    try {
      await maintenanceAPI.submitPayment({
        billId: selectedBill.id,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        amount: payment.amount,
        screenshotUrl: payment.screenshotUrl
      });
      notify('Payment submitted for admin review');
      setShowPayment(false);
      await load();
    } catch (error) {
      notify(error.response?.data?.message || 'Could not submit payment');
    }
  };

  const submitComplaint = async (event) => {
    event.preventDefault();
    await complaintAPI.create(complaint);
    setComplaint({ title: '', description: '' });
    setShowComplaint(false);
    notify('Complaint submitted');
    load();
  };

  const raiseBillDispute = async (bill) => {
    const subject = window.prompt('Dispute subject', `Issue with ${bill.bill_number || 'maintenance bill'}`);
    if (!subject) return;
    const description = window.prompt('Describe the issue');
    if (!description) return;
    try {
      await maintenanceAPI.createDispute({ billId: bill.id, subject, description });
      notify('Bill dispute submitted');
    } catch (error) {
      notify(error.response?.data?.message || 'Could not submit dispute');
    }
  };

  const printDocument = (type, bill) => {
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
      <tr><th>Late Fee</th><td>${money(bill.late_fee)}</td></tr>
      <tr><th class="total">Total</th><td class="total">${money(bill.total_amount)}</td></tr>
      </table><p class="muted right">Generated on ${new Date().toLocaleString('en-IN')}</p>
      </div><script>window.print();</script></body></html>`;
    const docWindow = window.open('', '_blank', 'width=900,height=700');
    if (!docWindow) return notify('Popup blocked. Allow popups to print.');
    docWindow.document.write(html);
    docWindow.document.close();
  };

  const quickActions = [
    { label: 'Pay Maintenance', icon: CreditCard, action: () => openPayment() },
    { label: 'Complaints', icon: MessageSquarePlus, action: () => navigate('/resident/complaints') },
    { label: 'Notices', icon: Bell, action: () => navigate('/resident/notices') },
    { label: 'My Vehicles', icon: Car, action: () => navigate('/resident/profile') }
  ];

  return (
    <div>
      {toast && <div className="resident-toast">{toast}</div>}
      <div className="portal-page-title">
        <div><h1>Dashboard</h1><p>Your home, payments and society updates at a glance.</p></div>
      </div>

      <section className="resident-welcome">
        {loading ? (
          <CardSkeleton count={3} />
        ) : (
          <>
            <div className="resident-identity">
              <span className={`resident-avatar ${profilePhoto ? 'has-photo' : ''}`}>
                {profilePhoto ? <img src={profilePhoto} alt="Resident profile" loading="lazy" decoding="async" /> : (user?.name || 'R').charAt(0)}
              </span>
              <div><small>Welcome back,</small><strong>{user?.name || 'Resident'}</strong><span>Resident account</span></div>
            </div>
            <div className="resident-balance"><span>Outstanding Due</span><strong>{money(summary.due)}</strong><small>{summary.nextDue ? `Due on ${fullDate(summary.nextDue)}` : 'Nothing due right now'}</small><button className="resident-pay" onClick={() => openPayment()}>Pay Now</button></div>
            <div className="resident-balance"><span>Total Paid</span><strong>{money(summary.paid)}</strong><small>{summary.underReview} payment under review</small></div>
          </>
        )}
      </section>

      <div className="portal-dashboard-grid">
        <section className="portal-panel">
          <div className="portal-panel-head"><div><h2>Quick Actions</h2><p>Everything you use most often</p></div></div>
          <div className="resident-quick-grid">
            {quickActions.map(({ label, icon: Icon, action }) => (
              <button className="resident-quick" key={label} onClick={action}>
                <span><Icon size={18} /></span>{label}
              </button>
            ))}
          </div>
        </section>

        <section className="portal-panel">
          <div className="portal-panel-head"><div><h2>My Flat</h2><p>Your assigned residence details.</p></div><Building2 size={17} /></div>
          {loading ? <CardSkeleton count={2} /> : (
            <div className="grid grid-cols-2 gap-3 p-4 text-sm">
              <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs font-bold uppercase text-slate-500">Flat</span><strong className="mt-1 block text-slate-900">Flat {flatDetails?.flat_no || 'N/A'}</strong></div>
              <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs font-bold uppercase text-slate-500">Wing</span><strong className="mt-1 block text-slate-900">{flatDetails?.wing || '-'}</strong></div>
              <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs font-bold uppercase text-slate-500">Floor</span><strong className="mt-1 block text-slate-900">{flatDetails?.floor_no ?? '-'}</strong></div>
              <div className="rounded-lg bg-green-50 p-3"><span className="block text-xs font-bold uppercase text-green-700">Status</span><strong className="mt-1 block text-green-800">{flatDetails?.flat_status || 'Assigned'}</strong></div>
            </div>
          )}
        </section>
      </div>

      <section className="portal-panel resident-summary-panel">
          <div className="portal-panel-head"><div><h2>Resident Summary</h2><p>Quick counts with full pages in the sidebar.</p></div></div>
          <div className="portal-status-summary">
            <div><span>Complaints</span><strong>{complaints.length}</strong></div>
            <div><span>Notices</span><strong>{notices.length}</strong></div>
            <div><span>Pending Bills</span><strong>{pendingBills.length}</strong></div>
          </div>
      </section>

      <section className="portal-panel resident-maintenance-panel" id="maintenance">
          <div className="portal-panel-head">
            <div><h2>Maintenance Preview</h2><p>Latest bills shown here, full page in sidebar.</p></div>
            <button className="resident-pay" onClick={() => navigate('/resident/maintenance')}>View All</button>
          </div>
          {loading ? (
            <TableSkeleton rows={3} columns={4} />
          ) : bills.length ? (
            <div style={{ overflowX: 'auto' }}><table className="resident-payments">
              <thead><tr><th>Month</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{bills.slice(0, 3).map((bill) => (
                <tr key={bill.id}>
                  <td><strong>{monthName(bill.month)} {bill.year}</strong><small>{bill.bill_number || `BILL-${bill.id}`}</small></td>
                  <td>{money(bill.total_amount)}</td>
                  <td><span className={`portal-status ${String(bill.payment_status).toLowerCase().replace(' ', '_')}`}>{bill.payment_status}</span></td>
                  <td>
                    <div className="resident-bill-actions">
                      {bill.payment_status !== 'Paid' && <button onClick={() => openPayment(bill)}><CreditCard size={11} /> Pay</button>}
                      <button onClick={() => printDocument('Maintenance Invoice', bill)}><FileText size={11} /> Invoice</button>
                      {bill.payment_status === 'Paid' && <button onClick={() => printDocument('Payment Receipt', bill)}><Download size={11} /> Receipt</button>}
                      {bill.payment_status !== 'Paid' && <button onClick={() => raiseBillDispute(bill)}><MessageSquareWarning size={11} /> Dispute</button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <div className="portal-empty"><ReceiptIndianRupee size={23} /><br />No maintenance bills have been issued yet.</div>}
      </section>

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

      {showPayment && selectedBill && (

        <div className="portal-modal-backdrop" onMouseDown={() => setShowPayment(false)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <form onSubmit={submitPayment} style={{ display: 'flex', flexDirection: 'column', maxHeight: '92vh', margin: 0 }}>
              <div className="portal-modal-head">

                <div>
                  <h3>Submit payment proof</h3>
                  <p>{selectedBill.bill_number || `Bill #${selectedBill.id}`} · {money(selectedBill.total_amount)}</p>
                </div>
              </div>
              <div className="portal-form" style={{ overflowY: 'auto', flex: '1 1 auto', display: 'grid', gap: '13px', padding: '18px 20px 20px' }}>
                <div className="resident-qr-card" style={{ gridColumn: '1 / -1' }}>
                  {paymentSettings.paymentQrImage ? (
                    <img src={paymentSettings.paymentQrImage} alt="Maintenance payment scanner" />
                  ) : (
                    <div className="resident-qr-empty">
                      <QrCode size={38} />
                      <strong>Payment scanner not uploaded yet</strong>
                      <span>Please contact society admin.</span>
                    </div>
                  )}
                  <div>
                    <strong>{paymentSettings.societyName || 'Society Payment'}</strong>
                    {paymentSettings.paymentUpiId && <span>UPI ID: {paymentSettings.paymentUpiId}</span>}
                    <p>{paymentSettings.paymentNote || 'Scan the QR, complete payment, then submit your transaction details below.'}</p>
                  </div>
                </div>
                <label><span>Payment Method</span><select value={payment.paymentMethod} onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value })}><option>UPI</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option></select></label>
                <label><span>Amount</span><input type="number" min="1" required value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></label>
                <label className="portal-field-full"><span>Transaction ID</span><input required value={payment.transactionId} onChange={(e) => setPayment({ ...payment, transactionId: e.target.value })} placeholder="UPI/ref/cheque number" /></label>
                <label className="portal-field-full"><span>Screenshot URL (optional)</span><input value={payment.screenshotUrl} onChange={(e) => setPayment({ ...payment, screenshotUrl: e.target.value })} placeholder="Paste payment proof link" /></label>
              </div>
              <div className="portal-form-actions" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end', gap: '9px', padding: '15px 20px', borderTop: '1px solid var(--portal-line)', background: '#fdfdfd', borderBottomLeftRadius: '14px', borderBottomRightRadius: '14px' }}>
                <button type="button" className="portal-light-btn" onClick={() => setShowPayment(false)}>Cancel</button>
                <button className="portal-primary-btn"><Send size={14} /> Submit for Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
