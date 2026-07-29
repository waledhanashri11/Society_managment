/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreditCard, Download, FileText, MessageSquareWarning, QrCode,
  ReceiptIndianRupee, Send, Printer, CalendarDays, CheckCircle2,
  Clock, AlertTriangle, ArrowUpRight, History
} from 'lucide-react';
import { maintenanceAPI, settingsAPI } from '../services/api';
import { getUser } from '../utils/auth';
import { TableSkeleton } from '../components/Skeletons';
import { useTranslation } from 'react-i18next';
import '../admin/maintenance.css';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatMonthDisplay = (month, year) => {
  if (!month) return '—';
  if (isNaN(Number(month))) return `${month} ${year || ''}`.trim();
  return `${new Date(2026, Number(month) - 1).toLocaleDateString('en-IN', { month: 'short' })} ${year || ''}`.trim();
};
const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const today = () => new Date().toISOString().slice(0, 10);

const SUPPORT_PARTIAL_PAYMENTS = true;

const formatStatusLabel = (st, t) => {
  if (!st) return '';
  const key = {
    'Occupied': 'occupied', 'occupied': 'occupied',
    'Vacant': 'vacant', 'vacant': 'vacant',
    'Assigned': 'assigned', 'assigned': 'assigned',
    'Paid': 'paid', 'paid': 'paid',
    'Pending': 'pending', 'pending': 'pending',
    'Overdue': 'overdue', 'overdue': 'overdue',
    'Under Review': 'underReview', 'under_review': 'underReview',
  }[st];
  return key ? t(`statusLabel.${key}`) : st;
};

const statusBadge = (bill, t) => {
  const st = String(bill.payment_status || '').toUpperCase();
  const lst = String(bill.latest_payment_status || '').toUpperCase();

  const isRejected = st === 'REJECTED' || lst === 'REJECTED' || Boolean(bill.rejection_reason || bill.rejectionReason);
  const rejectionText = bill.rejection_reason || bill.rejectionReason || bill.remarks;
  const rejectedAt = bill.rejected_at ? new Date(bill.rejected_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const adminName = bill.rejected_by_name || bill.rejected_by || 'Admin';

  if (isRejected) {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
        <span 
          style={{ 
            borderRadius: '99px', 
            padding: '3px 8px', 
            fontSize: '10px', 
            fontWeight: '700',
            color: '#b42318',
            background: '#fef3f2',
            border: '1px solid #fecaca',
            display: 'inline-block',
            textTransform: 'uppercase',
            letterSpacing: '0.02em'
          }}
        >
          Rejected
        </span>
        {rejectionText && (
          <div style={{ fontSize: '10px', color: '#991b1b', fontWeight: '600', background: '#fff1f1', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '6px', maxWidth: '260px' }}>
            <strong>Reason:</strong> {rejectionText}
            {rejectedAt && (
              <div style={{ fontSize: '9px', color: '#7f1d1d', marginTop: '2px', fontWeight: 'normal' }}>
                Rejected on {rejectedAt} by {adminName}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  let label = bill.payment_status || 'Pending';
  let color = '#bd5b00';
  let bg = '#fff2e5';

  if (st === 'PAID') {
    color = '#05783b';
    bg = '#e8f8ef';
  } else if (st === 'OVERDUE') {
    color = '#b42318';
    bg = '#fef3f2';
  }

  return (
    <span 
      style={{ 
        borderRadius: '99px', 
        padding: '3px 8px', 
        fontSize: '10px', 
        fontWeight: '700',
        color: color,
        background: bg,
        display: 'inline-block',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        verticalAlign: 'middle'
      }}
    >
      {formatStatusLabel(label, t)}
    </span>
  );
};

function MiniBarChart({ bills }) {
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIndex = new Date().getMonth();
  const last6Months = [];
  for (let i = 5; i >= 0; i--) {
    const idx = (currentMonthIndex - i + 12) % 12;
    last6Months.push({ month: shortMonths[idx], monthNum: idx + 1, collected: 0, pending: 0 });
  }

  bills.forEach((bill) => {
    const mNum = Number(bill.month);
    const item = last6Months.find((m) => m.monthNum === mNum);
    if (item) {
      if (bill.payment_status === 'Paid') {
        item.collected += Number(bill.paid_amount || bill.total_amount || 0);
      } else {
        item.pending += Number(bill.remaining_amount || bill.total_amount || 0);
      }
    }
  });

  const max = Math.max(...last6Months.map((item) => item.collected + item.pending), 1000);

  return (
    <div className="mm-bar-chart">
      <div className="mm-chart-scale">
        <span>{money(max)}</span>
        <span>{money(max / 2)}</span>
        <span>₹0</span>
      </div>
      {last6Months.map((item, index) => (
        <div className="mm-bar-column" key={`${item.month}-${index}`}>
          <div className="mm-bar-stack" title={`${item.month}: Paid ${money(item.collected)}, Pending ${money(item.pending)}`}>
            <span className="mm-bar-pending" style={{ height: `${item.pending > 0 ? Math.max(5, (item.pending / max) * 150) : 0}px` }} />
            <span className="mm-bar-paid" style={{ height: `${item.collected > 0 ? Math.max(5, (item.collected / max) * 150) : 0}px` }} />
          </div>
          <small>{item.month}</small>
        </div>
      ))}
    </div>
  );
}

function ResidentMaintenance() {
  const { t } = useTranslation();
  const user = getUser();
  const [bills, setBills] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState({});
  const [societySettings, setSocietySettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingBill, setLoadingBill] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'bills' | 'payments'
  const [showPayment, setShowPayment] = useState(false);
  const [paidConfirmed, setPaidConfirmed] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [timelineBill, setTimelineBill] = useState(null);
  const [payment, setPayment] = useState({
    paymentMethod: 'UPI',
    transactionId: '',
    amount: '',
    screenshotUrl: '',
    paymentDate: today()
  });

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      maintenanceAPI.getUserMaintenance(),
      settingsAPI.getPayment(),
      settingsAPI.get()
    ]);
    if (results[0].status === 'fulfilled') setBills(unwrap(results[0].value));
    if (results[1].status === 'fulfilled') setPaymentSettings(results[1].value.data || {});
    if (results[2].status === 'fulfilled') setSocietySettings(unwrap(results[2].value));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingBills = useMemo(() => bills.filter((bill) => bill.payment_status !== 'Paid'), [bills]);
  const paidBills = useMemo(() => bills.filter((bill) => bill.payment_status === 'Paid'), [bills]);
  const overdueBills = useMemo(() => bills.filter((bill) => bill.payment_status === 'Overdue'), [bills]);
  const rejectedBills = useMemo(() => bills.filter((bill) => {
    const st = String(bill.payment_status || '').toUpperCase();
    const lst = String(bill.latest_payment_status || '').toUpperCase();
    return st === 'REJECTED' || lst === 'REJECTED' || Boolean(bill.rejection_reason || bill.rejectionReason);
  }), [bills]);

  const summary = useMemo(() => {
    const due = pendingBills.reduce((sum, bill) => {
      const remaining = bill.remainingPayable !== undefined ? bill.remainingPayable : (bill.remaining_amount !== undefined ? bill.remaining_amount : bill.total_amount);
      return sum + Number(remaining || 0);
    }, 0);
    const paid = paidBills.reduce((sum, bill) => sum + Number(bill.paid_amount || bill.total_amount || 0), 0);
    const overdue = overdueBills.reduce((sum, bill) => sum + Number(bill.remaining_amount || bill.total_amount || 0), 0);
    const totalBilled = due + paid;
    const collectionPercentage = totalBilled > 0 ? Math.round((paid / totalBilled) * 100) : 0;

    return {
      due,
      paid,
      overdue,
      collectionPercentage,
      underReview: bills.filter((bill) => ['Under Review', 'Pending Verification'].includes(bill.payment_status)).length
    };
  }, [bills, paidBills, pendingBills, overdueBills]);

  const openPayment = async (bill = pendingBills[0]) => {
    if (!bill) return notify('No pending bill to pay');
    setLoadingBill(true);
    try {
      const response = await maintenanceAPI.getBillById(bill.id);
      const fullBill = response.data?.data?.bill || response.data?.bill || bill;
      setSelectedBill(fullBill);
      
      const remaining = fullBill.remainingPayable !== undefined ? fullBill.remainingPayable : (fullBill.remaining_amount !== undefined ? fullBill.remaining_amount : fullBill.total_amount);
      const totalDue = Number(remaining || 0) + Number(fullBill.previous_outstanding || 0);

      setPayment({
        paymentMethod: 'UPI',
        transactionId: '',
        amount: String(totalDue),
        screenshotUrl: '',
        paymentDate: today()
      });
      setPaidConfirmed(false);
      setShowPayment(true);
    } catch (error) {
      notify('Failed to load complete bill details');
    } finally {
      setLoadingBill(false);
    }
  };

  const closePayment = () => {
    setShowPayment(false);
    setPaidConfirmed(false);
    setSelectedBill(null);
  };

  const downloadQrCode = () => {
    if (!paymentSettings.paymentQrImage) return notify('No QR code image available');
    
    const link = document.createElement('a');
    link.href = paymentSettings.paymentQrImage;
    link.download = `${paymentSettings.societyName || 'society'}-payment-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScreenshot = (event) => {
    const file = event.target.files?.[0];
    if (!file) return setPayment((current) => ({ ...current, screenshotUrl: '' }));
    if (!file.type.startsWith('image/')) return notify('Please upload an image screenshot');

    const reader = new FileReader();
    reader.onload = () => setPayment((current) => ({ ...current, screenshotUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!selectedBill) return;
    if (!payment.transactionId.trim()) return notify('Transaction / UTR number is required');

    setSubmitting(true);
    try {
      await maintenanceAPI.submitPayment({
        billId: selectedBill.id,
        paymentMethod: payment.paymentMethod,
        utrNumber: payment.transactionId.trim(),
        amount: payment.amount,
        screenshot: payment.screenshotUrl,
        paymentDate: payment.paymentDate
      });
      notify('Payment submitted for admin verification');
      closePayment();
      await load();
    } catch (error) {
      notify(error.response?.data?.message || 'Could not submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
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
    const itemsHtml = bill.items && bill.items.length > 0
      ? bill.items.map(item => `<tr><th>${item.name}</th><td>${money(item.amount)}</td></tr>`).join('')
      : '';
      
    const prevOutstandingHtml = Number(bill.previous_outstanding || 0) > 0
      ? `<tr><th>Previous Outstanding</th><td>${money(bill.previous_outstanding)}</td></tr>`
      : '';

    const html = `
      <html><head><title>${type}</title><style>
      body{font-family:Arial,sans-serif;padding:32px;color:#172033}.box{max-width:760px;margin:0 auto;border:1px solid #dfe5ee;border-radius:14px;padding:28px}
      h1{margin:0;font-size:26px}.muted{color:#667085;margin-top:6px}table{width:100%;border-collapse:collapse;margin-top:24px}
      td,th{border-bottom:1px solid #edf0f3;padding:12px;text-align:left}.total{font-size:22px;font-weight:800}.right{text-align:right}
      </style></head><body><div class="box">
      <h1>${type}</h1><div class="muted">Society Management System</div>
      <table>
      <tr><th>Bill No.</th><td>${bill.bill_number || `BILL-${bill.id}`}</td></tr>
      <tr><th>Resident</th><td>${user?.name || 'Resident'}</td></tr>
      <tr><th>Flat</th><td>${bill.flat_no || ''}</td></tr>
      <tr><th>Flat Type</th><td>${bill.flat_type_name || 'Not Assigned'}</td></tr>
      <tr><th>Period</th><td>${formatMonthDisplay(bill.month, bill.year)}</td></tr>
      <tr><th>Due Date</th><td>${fullDate(bill.due_date)}</td></tr>
      <tr><th>Status</th><td>${bill.payment_status}</td></tr>
      <tr><th>Base Maintenance Charge</th><td>${money(bill.amount)}</td></tr>
      ${itemsHtml}
      <tr><th>Original Late Fee</th><td>${money(bill.late_fee || bill.penalty_amount)}</td></tr>
      <tr><th>Original Total Bill</th><td>${money(bill.total_amount)}</td></tr>
      ${Number(bill.write_off_amount || bill.writeoff_amount || 0) > 0 ? `<tr><th style="color:#7a5af8;">Write-Off Discount</th><td style="color:#7a5af8;font-weight:bold;">- ${money(bill.write_off_amount || bill.writeoff_amount)}</td></tr>` : ''}
      ${Number(bill.paid_amount || 0) > 0 ? `<tr><th>Amount Paid</th><td>${money(bill.paid_amount)}</td></tr>` : ''}
      ${prevOutstandingHtml}
      <tr><th class="total">Remaining Payable</th><td class="total">${money(Number(bill.remainingPayable !== undefined ? bill.remainingPayable : bill.remaining_amount) + Number(bill.previous_outstanding || 0))}</td></tr>
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

  if (loading) {
    return (
      <div className="mm-shell">
        <div className="mm-page-head">
          <div>
            <div className="mm-eyebrow">MAINTENANCE</div>
            <h1>{t('resMaint.title', 'Maintenance Management')}</h1>
            <p>{t('resMaint.subtitle', 'Track collections, bills, expenses and resident payments from one place.')}</p>
          </div>
        </div>
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div className="mm-shell">
      {toast && <div className="mm-toast">{toast}</div>}
      
      {/* Rejected Payment Warning Banner */}
      {rejectedBills.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rejectedBills.map((bill) => {
            const rejectedAt = bill.rejected_at ? new Date(bill.rejected_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
            const adminName = bill.rejected_by_name || bill.rejected_by || 'Admin';
            return (
              <div 
                key={bill.id} 
                style={{ 
                  padding: '14px 18px', 
                  borderRadius: '10px', 
                  background: '#fff1f1', 
                  border: '1px solid #fecaca', 
                  color: '#991b1b', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(220,38,38,0.06)'
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', display: 'block', color: '#b91c1c' }}>
                    ⚠️ Payment Rejected by {adminName} — {formatMonthDisplay(bill.month, bill.year)} ({bill.bill_number || `BILL-${bill.id}`})
                  </strong>
                  <span style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '2px', display: 'block' }}>
                    <strong>Rejection Reason:</strong> {bill.rejection_reason || bill.rejectionReason || bill.remarks || 'Payment proof verification failed'}
                    {rejectedAt && ` · Rejected on ${rejectedAt}`}
                  </span>
                </div>
                <button 
                  className="mm-button mm-button-primary"
                  style={{ background: 'linear-gradient(90deg, #087d40, #0ab35c)', fontSize: '11px', padding: '6px 14px', border: 'none', cursor: 'pointer' }}
                  onClick={() => openPayment(bill)}
                >
                  <CreditCard size={13} /> Resubmit Payment
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Header Bar */}
      <div className="mm-page-head">
        <div>
          <div className="mm-eyebrow">MAINTENANCE</div>
          <h1>{t('resMaint.title', 'Maintenance Bills')}</h1>
          <p>{t('resMaint.subtitle', 'Track your maintenance dues, invoices, and payment receipts.')}</p>
        </div>
        <div className="mm-head-actions">
          <button className="mm-button mm-button-primary" style={{ background: 'linear-gradient(90deg, #087d40, #0ab35c)', border: 'none' }} onClick={() => openPayment()}>
            <CreditCard size={15} /> {t('resMaint.payNow', 'Pay Dues')}
          </button>
        </div>
      </div>
        <section className="mm-panel" style={{ padding: '0' }}>
          <div className="mm-panel-head" style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
            <div>
              <h2>Maintenance Invoices & Receipts</h2>
              <p>View all monthly bills, pay dues, and print official receipts.</p>
            </div>
          </div>

          {bills.length ? (
            <div className="portal-table-wrap">
              <table className="portal-data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Bill Amount</th>
                    <th>Write-Off</th>
                    <th>Final Payable</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => {
                    const writeOffAmt = Number(bill.write_off_amount || bill.writeoff_amount || 0);
                    const remainingAmt = Number(bill.remainingPayable !== undefined ? bill.remainingPayable : (bill.remaining_amount !== undefined ? bill.remaining_amount : bill.total_amount));
                    return (
                      <tr key={bill.id}>
                        <td>
                          <strong>{formatMonthDisplay(bill.month, bill.year)}</strong>
                          <div className="portal-muted-text">{bill.bill_number || `BILL-${bill.id}`}</div>
                        </td>
                        <td><strong>{money(bill.total_amount)}</strong></td>
                        <td>
                          {writeOffAmt > 0 ? (
                            <strong style={{ color: '#7a5af8' }}>- {money(writeOffAmt)}</strong>
                          ) : (
                            <span className="portal-muted-text">—</span>
                          )}
                        </td>
                        <td><strong style={{ color: '#1e3a8a' }}>{money(remainingAmt)}</strong></td>
                        <td>{statusBadge(bill, t)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="portal-row-actions" style={{ justifyContent: 'center', gap: '6px' }}>
                          {String(bill.payment_status || '').toUpperCase() !== 'PAID' && (
                            <button 
                              style={{ color: '#087d40', background: '#e8f8ef', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '11px' }}
                              onClick={() => openPayment(bill)}
                            >
                              <CreditCard size={13} /> {String(bill.payment_status || '').toUpperCase() === 'REJECTED' || String(bill.latest_payment_status || '').toUpperCase() === 'REJECTED' || bill.rejection_reason ? 'Resubmit Payment' : 'Pay'}
                            </button>
                          )}
                          <button 
                            style={{ color: '#334155', background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '11px' }}
                            onClick={() => handlePrint('Maintenance Invoice', bill)}
                          >
                            <FileText size={13} /> Invoice
                          </button>
                          {bill.payment_status === 'Paid' && (
                            <button 
                              style={{ color: '#334155', background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '11px' }}
                              onClick={() => handlePrint('Payment Receipt', bill)}
                            >
                              <Download size={13} /> Receipt
                            </button>
                          )}
                          <button 
                            style={{ color: '#4f46e5', background: '#eef2ff', border: '1px solid #c7d2fe', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '11px' }}
                            onClick={() => setTimelineBill(bill)}
                          >
                            <History size={13} /> Timeline
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="portal-empty" style={{ padding: '30px' }}>
              <ReceiptIndianRupee size={26} /><br />No maintenance bills found.
            </div>
          )}
        </section>

      {/* Payment Modal */}
      {showPayment && selectedBill && (
        <div className="portal-modal-backdrop" onMouseDown={closePayment}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <form onSubmit={submitPayment} style={{ display: 'flex', flexDirection: 'column', maxHeight: '92vh', margin: 0 }}>
              <div className="portal-modal-head">
                <div>
                  <h3>{t('resMaint.payViaUpi', 'Submit Maintenance Payment')}</h3>
                  <p>{selectedBill.bill_number || `Bill #${selectedBill.id}`} - {money(Number(selectedBill.total_amount || 0) + Number(selectedBill.previous_outstanding || 0))}</p>
                </div>
              </div>
              <div className="portal-form" style={{ overflowY: 'auto', flex: '1 1 auto', display: 'grid', gap: '13px', padding: '18px 20px 20px' }}>
                <div className="portal-field-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200" style={{ gridColumn: '1 / -1' }}>
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                    {paymentSettings.paymentQrImage ? (
                      <img 
                        src={paymentSettings.paymentQrImage} 
                        alt="Society Payment QR Code" 
                        className="w-40 h-40 object-contain bg-white border border-slate-100 rounded-lg p-2"
                      />
                    ) : (
                      <div className="w-40 h-40 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg bg-white text-slate-400">
                        <QrCode size={34} />
                        <span className="text-[10px] font-bold text-center px-2">{t('resMaint.qrNotUploaded', 'Payment QR not uploaded')}</span>
                      </div>
                    )}
                    
                    <strong className="mt-2 text-xs text-slate-800 text-center font-bold">
                      {paymentSettings.societyName || 'Society Payment'}
                    </strong>
                    {paymentSettings.paymentUpiId && (
                      <span className="mt-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 select-all">
                        UPI ID: {paymentSettings.paymentUpiId}
                      </span>
                    )}

                    <button 
                      type="button" 
                      onClick={downloadQrCode} 
                      disabled={!paymentSettings.paymentQrImage}
                      className="portal-primary-btn w-full mt-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ padding: '6px 10px', fontSize: '10px' }}
                    >
                      <Download size={12} /> {t('resMaint.downloadQr', 'Download QR')}
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 justify-between text-xs text-slate-700">
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1" style={{ fontSize: '11px', textTransform: 'uppercase' }}>{t('resMaint.howToPay', 'Steps to pay:')}</h3>
                      <ol className="list-decimal pl-4 space-y-1 font-semibold text-[11px] leading-snug">
                        <li>{t('resMaint.step1', 'Scan QR Code using GPay, PhonePe, or Paytm.')}</li>
                        <li>{t('resMaint.step2', 'Enter bill amount.')}</li>
                        <li>{t('resMaint.step3', 'Complete payment.')}</li>
                        <li>{t('resMaint.step4', 'Copy 12-digit UTR reference.')}</li>
                        <li>{t('resMaint.step5', 'Upload payment screenshot.')}</li>
                        <li>{t('resMaint.step6', 'Click Submit Payment.')}</li>
                      </ol>
                    </div>

                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 flex gap-2 items-start font-medium leading-snug">
                      <span className="shrink-0 font-bold">⚠️ {t('resMaint.warning', 'Warning')}:</span>
                      <span>{t('resMaint.warningText', 'Pay the exact bill amount for fast verification.')}</span>
                    </div>
                  </div>
                </div>

                {loadingBill ? (
                  <div className="portal-field-full" style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                    {t('resMaint.loadingBill', 'Loading bill details...')}
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 text-sm portal-field-full" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '4px', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                      <span>{t('resMaint.billSummary', 'Bill Summary')}</span>
                      <span>{selectedBill.bill_number || `BILL-${selectedBill.id}`}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: '#475467' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t('resMaint.baseCharge', 'Base Charge')}:</span>
                        <strong>{money(selectedBill.amount)}</strong>
                      </div>
                      {selectedBill.items && selectedBill.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{item.name}:</span>
                          <strong>{money(item.amount)}</strong>
                        </div>
                      ))}
                      {Number(selectedBill.penalty_amount || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{t('resMaint.lateFeePenalty', 'Late Fee / Penalty')}:</span>
                          <strong>{money(selectedBill.penalty_amount)}</strong>
                        </div>
                      )}
                      
                      <hr style={{ margin: '6px 0', border: 0, borderTop: '1px solid #e2e8f0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>{t('resMaint.originalBill', 'Original Bill Total')}:</span>
                        <strong>{money(selectedBill.total_amount)}</strong>
                      </div>

                      {Number(selectedBill.write_off_amount || selectedBill.writeoff_amount || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7a5af8', fontWeight: 600 }}>
                          <span>{t('resMaint.writeOffDiscount', 'Write-Off Discount')}:</span>
                          <strong>- {money(selectedBill.write_off_amount || selectedBill.writeoff_amount)}</strong>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t('resMaint.amountPaid', 'Paid Amount')}:</span>
                        <strong>{money(selectedBill.paid_amount)}</strong>
                      </div>

                      {Number(selectedBill.previous_outstanding || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b42318' }}>
                          <span>{t('resMaint.prevOutstanding', 'Previous Outstanding')}:</span>
                          <strong>{money(selectedBill.previous_outstanding)}</strong>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1e3a8a', fontSize: '0.8rem', borderTop: '1px dashed #cbd5e1', paddingTop: '4px', marginTop: '2px' }}>
                        <span>{t('resMaint.remainingPayable', 'Remaining Payable')}:</span>
                        <strong>{money(Number(selectedBill.remainingPayable !== undefined ? selectedBill.remainingPayable : selectedBill.remaining_amount) + Number(selectedBill.previous_outstanding || 0))}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {paidConfirmed && (
                  <>
                    <label><span>{t('resMaint.paymentMethod', 'Payment Method')}</span><select value={payment.paymentMethod} onChange={(event) => setPayment({ ...payment, paymentMethod: event.target.value })}><option>UPI</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option></select></label>
                    <label><span>{t('common.amount', 'Amount')}</span><input type="number" min="1" required readOnly={!SUPPORT_PARTIAL_PAYMENTS} style={{ background: !SUPPORT_PARTIAL_PAYMENTS ? '#f1f5f9' : 'white', cursor: !SUPPORT_PARTIAL_PAYMENTS ? 'not-allowed' : 'text' }} value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} /></label>
                    <label><span>{t('resMaint.paymentDate', 'Payment Date')}</span><input type="date" required value={payment.paymentDate} onChange={(event) => setPayment({ ...payment, paymentDate: event.target.value })} /></label>
                    <label className="portal-field-full"><span>{t('resMaint.utrNumber', 'UTR / Transaction ID')}</span><input required value={payment.transactionId} onChange={(event) => setPayment({ ...payment, transactionId: event.target.value })} placeholder="Enter 12-digit UTR number" /></label>
                    <label className="portal-field-full"><span>{t('resMaint.screenshotUpload', 'Screenshot Upload')}</span><input type="file" accept="image/*" onChange={handleScreenshot} /><small>Clear payment screenshot</small></label>
                    {payment.screenshotUrl && <img src={payment.screenshotUrl} alt="Payment screenshot preview" className="portal-field-full max-h-48 w-full rounded-lg border border-slate-200 object-contain" />}
                  </>
                )}
              </div>
              <div className="portal-form-actions" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end', gap: '9px', padding: '15px 20px', borderTop: '1px solid var(--portal-line)', background: '#fdfdfd', borderBottomLeftRadius: '14px', borderBottomRightRadius: '14px' }}>
                <button type="button" className="portal-light-btn" onClick={closePayment}>{t('common.cancel', 'Cancel')}</button>
                {!paidConfirmed ? (
                  <button type="button" className="portal-primary-btn" onClick={() => setPaidConfirmed(true)}><CreditCard size={14} /> {t('resMaint.ivePaid', 'I Have Paid')}</button>
                ) : (
                  <button className="portal-primary-btn" disabled={submitting}><Send size={14} /> {submitting ? t('resMaint.submitting', 'Submitting...') : t('resMaint.submitPayment', 'Submit Payment')}</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Payment Status Timeline Modal */}
      {timelineBill && (
        <div className="portal-modal-backdrop" onMouseDown={() => setTimelineBill(null)}>
          <div className="portal-modal" style={{ maxWidth: '560px' }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Payment Status Audit History & Timeline</h3>
                <p>{timelineBill.bill_number || `Bill #${timelineBill.id}`} — {formatMonthDisplay(timelineBill.month, timelineBill.year)} ({money(timelineBill.total_amount)})</p>
              </div>
              <button type="button" className="portal-modal-close" onClick={() => setTimelineBill(null)}>×</button>
            </div>

            <div style={{ padding: '24px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '26px', borderLeft: '2px dashed #cbd5e1', marginLeft: '10px' }}>
                
                {/* Step 1: Bill Generated */}
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '-33px', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#3b82f6', border: '3px solid white', boxShadow: '0 0 0 1px #3b82f6' }} />
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>Bill Generated</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Bill Amount: <strong>{money(timelineBill.total_amount)}</strong> · Due Date: {fullDate(timelineBill.due_date || timelineBill.maintenance_due_date)}
                  </div>
                </div>

                {/* History entries or inferred entries */}
                {Array.isArray(timelineBill.status_history) && timelineBill.status_history.length > 0 ? (
                  timelineBill.status_history.map((hist, idx) => {
                    const statusUpper = String(hist.new_status || '').toUpperCase();
                    let dotColor = '#64748b';
                    let badgeBg = '#f1f5f9';
                    let badgeColor = '#475569';
                    if (statusUpper.includes('REJECT')) {
                      dotColor = '#ef4444';
                      badgeBg = '#fef2f2';
                      badgeColor = '#b91c1c';
                    } else if (statusUpper.includes('APPROV') || statusUpper.includes('PAID')) {
                      dotColor = '#22c55e';
                      badgeBg = '#f0fdf4';
                      badgeColor = '#15803d';
                    } else if (statusUpper.includes('PEND') || statusUpper.includes('SUBMIT')) {
                      dotColor = '#f59e0b';
                      badgeBg = '#fefce8';
                      badgeColor = '#a16207';
                    }

                    return (
                      <div key={hist.id || idx} style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '-33px', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: dotColor, border: '3px solid white', boxShadow: `0 0 0 1px ${dotColor}` }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: badgeBg, color: badgeColor, border: `1px solid ${badgeColor}33` }}>
                            {hist.previous_status ? `${hist.previous_status} → ${hist.new_status}` : hist.new_status}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                            {fullDate(hist.created_at)} {new Date(hist.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                          <strong>Action By:</strong> {hist.changed_by_name || 'Admin'}
                        </div>
                        {hist.reason && (
                          <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px', background: '#fff1f2', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                            <strong>Rejection Reason:</strong> {hist.reason}
                          </div>
                        )}
                        {hist.comment && (
                          <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px', background: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <strong>Approval Note:</strong> {hist.comment}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <>
                    {/* Fallback timeline if status_history not populated */}
                    {(timelineBill.rejection_reason || String(timelineBill.payment_status).toUpperCase() === 'REJECTED') && (
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '-33px', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', border: '3px solid white', boxShadow: '0 0 0 1px #ef4444' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                            Payment Rejected
                          </span>
                          {timelineBill.rejected_at && <span style={{ fontSize: '11px', color: '#64748b' }}>{fullDate(timelineBill.rejected_at)}</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                          <strong>Action By:</strong> {timelineBill.rejected_by_name || 'Admin'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px', background: '#fff1f2', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                          <strong>Rejection Reason:</strong> {timelineBill.rejection_reason || 'Verification failed'}
                        </div>
                      </div>
                    )}

                    {(String(timelineBill.payment_status).toUpperCase() === 'PAID' || String(timelineBill.payment_status).toUpperCase() === 'APPROVED') && (
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '-33px', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#22c55e', border: '3px solid white', boxShadow: '0 0 0 1px #22c55e' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                            Payment Approved
                          </span>
                          {timelineBill.approved_at && <span style={{ fontSize: '11px', color: '#64748b' }}>{fullDate(timelineBill.approved_at)}</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                          <strong>Action By:</strong> {timelineBill.approved_by_name || 'Admin'}
                        </div>
                        {timelineBill.approval_comment && (
                          <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px', background: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <strong>Approval Note:</strong> {timelineBill.approval_comment}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>

            <div className="portal-modal-actions" style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="portal-secondary-btn" onClick={() => setTimelineBill(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentMaintenance;
