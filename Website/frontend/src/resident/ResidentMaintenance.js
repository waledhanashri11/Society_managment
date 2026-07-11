import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreditCard, Download, FileText, MessageSquareWarning, QrCode,
  ReceiptIndianRupee, Send
} from 'lucide-react';
import { maintenanceAPI, settingsAPI } from '../services/api';
import { getUser } from '../utils/auth';
import { TableSkeleton } from '../components/Skeletons';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const monthName = (month) => new Date(2026, Number(month || 1) - 1).toLocaleDateString('en-IN', { month: 'short' });
const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const today = () => new Date().toISOString().slice(0, 10);
const statusClass = (status) => String(status || 'Pending').toLowerCase().replace(/\s+/g, '_');

const ResidentMaintenance = () => {
  const user = getUser();
  const [bills, setBills] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paidConfirmed, setPaidConfirmed] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
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
      settingsAPI.getPayment()
    ]);
    if (results[0].status === 'fulfilled') setBills(unwrap(results[0].value));
    if (results[1].status === 'fulfilled') setPaymentSettings(results[1].value.data || {});
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingBills = useMemo(() => bills.filter((bill) => bill.payment_status !== 'Paid'), [bills]);
  const paidBills = useMemo(() => bills.filter((bill) => bill.payment_status === 'Paid'), [bills]);
  const summary = useMemo(() => ({
    due: pendingBills.reduce((sum, bill) => sum + Number(bill.remaining_amount || bill.total_amount || 0), 0),
    paid: paidBills.reduce((sum, bill) => sum + Number(bill.paid_amount || bill.total_amount || 0), 0),
    underReview: bills.filter((bill) => ['Under Review', 'Pending Verification'].includes(bill.payment_status)).length
  }), [bills, paidBills, pendingBills]);

  const openPayment = (bill = pendingBills[0]) => {
    if (!bill) return notify('No pending bill to pay');
    setSelectedBill(bill);
    setPayment({
      paymentMethod: 'UPI',
      transactionId: '',
      amount: String(bill.remaining_amount || bill.total_amount || ''),
      screenshotUrl: '',
      paymentDate: today()
    });
    setPaidConfirmed(false);
    setShowPayment(true);
  };

  const closePayment = () => {
    setShowPayment(false);
    setPaidConfirmed(false);
    setSelectedBill(null);
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
      body{font-family:Arial,sans-serif;padding:32px;color:#172033}.box{max-width:760px;margin:0 auto;border:1px solid #dfe5ee;border-radius:14px;padding:28px}
      h1{margin:0;font-size:26px}.muted{color:#667085;margin-top:6px}table{width:100%;border-collapse:collapse;margin-top:24px}
      td,th{border-bottom:1px solid #edf0f3;padding:12px;text-align:left}.total{font-size:22px;font-weight:800}.right{text-align:right}
      </style></head><body><div class="box">
      <h1>${type}</h1><div class="muted">Society Management System</div>
      <table>
      <tr><th>Bill No.</th><td>${bill.bill_number || `BILL-${bill.id}`}</td></tr>
      <tr><th>Resident</th><td>${user?.name || 'Resident'}</td></tr>
      <tr><th>Flat</th><td>${bill.flat_no || ''}</td></tr>
      <tr><th>Period</th><td>${monthName(bill.month)} ${bill.year || ''}</td></tr>
      <tr><th>Due Date</th><td>${fullDate(bill.due_date)}</td></tr>
      <tr><th>Status</th><td>${bill.payment_status}</td></tr>
      <tr><th>Late Fee</th><td>${money(bill.late_fee || bill.penalty_amount)}</td></tr>
      <tr><th class="total">Total</th><td class="total">${money(bill.total_amount)}</td></tr>
      </table><p class="muted right">Generated on ${new Date().toLocaleString('en-IN')}</p>
      </div><script>window.print();</script></body></html>`;
    const docWindow = window.open('', '_blank', 'width=900,height=700');
    if (!docWindow) return notify('Popup blocked. Allow popups to print.');
    docWindow.document.write(html);
    docWindow.document.close();
  };

  if (loading) {
    return (
      <div className="portal-module">
        <div className="portal-page-title">
          <div>
            <h1>Maintenance</h1>
            <p>View bills, scan payment QR, submit proof and download receipts.</p>
          </div>
        </div>
        <div className="portal-status-summary" style={{ marginBottom: 14 }}>
          <div><span>Outstanding Due</span><strong>—</strong></div>
          <div><span>Total Paid</span><strong>—</strong></div>
          <div><span>Under Review</span><strong>—</strong></div>
        </div>
        <section className="portal-panel portal-table-card">
          <TableSkeleton rows={5} columns={4} />
        </section>
      </div>
    );
  }

  return (
    <div className="portal-module">
      {toast && <div className="resident-toast">{toast}</div>}
      <div className="portal-page-title">
        <div>
          <h1>Maintenance</h1>
          <p>View bills, scan payment QR, submit proof and download receipts.</p>
        </div>
        <button className="portal-primary-btn" onClick={() => openPayment()}>
          <CreditCard size={16} /> Pay Now
        </button>
      </div>

      <div className="portal-status-summary" style={{ marginBottom: 14 }}>
        <div><span>Outstanding Due</span><strong>{money(summary.due)}</strong></div>
        <div><span>Total Paid</span><strong>{money(summary.paid)}</strong></div>
        <div><span>Pending Verification</span><strong>{summary.underReview}</strong></div>
      </div>

      <section className="portal-panel portal-table-card">
        {bills.length ? (
          <div className="portal-table-wrap">
            <table className="resident-payments">
              <thead><tr><th>Month</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{bills.map((bill) => (
                <tr key={bill.id}>
                  <td><strong>{monthName(bill.month)} {bill.year}</strong><small>{bill.bill_number || `BILL-${bill.id}`}</small></td>
                  <td>{money(bill.total_amount)}</td>
                  <td><span className={`portal-status ${statusClass(bill.payment_status)}`}>{bill.payment_status || 'Pending'}</span></td>
                  <td>
                    <div className="resident-bill-actions">
                      {bill.payment_status !== 'Paid' && <button onClick={() => openPayment(bill)}><CreditCard size={11} /> Pay via UPI</button>}
                      <button onClick={() => printDocument('Maintenance Invoice', bill)}><FileText size={11} /> Invoice</button>
                      {bill.payment_status === 'Paid' && <button onClick={() => printDocument('Payment Receipt', bill)}><Download size={11} /> Receipt</button>}
                      {bill.payment_status !== 'Paid' && <button onClick={() => raiseBillDispute(bill)}><MessageSquareWarning size={11} /> Dispute</button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="portal-empty"><ReceiptIndianRupee size={26} /><br />No maintenance bills have been issued yet.</div>
        )}
      </section>

      {showPayment && selectedBill && (
        <div className="portal-modal-backdrop" onMouseDown={closePayment}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <form onSubmit={submitPayment} style={{ display: 'flex', flexDirection: 'column', maxHeight: '92vh', margin: 0 }}>
              <div className="portal-modal-head">
                <div>
                  <h3>Pay via UPI</h3>
                  <p>{selectedBill.bill_number || `Bill #${selectedBill.id}`} - {money(selectedBill.total_amount)}</p>
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
                    <p>{paymentSettings.paymentNote || 'Scan this QR using Google Pay, PhonePe, Paytm, BHIM or any UPI app. After payment, click I have paid and submit your UTR details.'}</p>
                  </div>
                </div>

                <div className="settings-status-grid portal-field-full">
                  <div><span>Bill Number</span><strong>{selectedBill.bill_number || `BILL-${selectedBill.id}`}</strong></div>
                  <div><span>Maintenance Amount</span><strong>{money(selectedBill.remaining_amount || selectedBill.total_amount)}</strong></div>
                  <div><span>Due Date</span><strong>{fullDate(selectedBill.due_date)}</strong></div>
                  <div><span>Status</span><strong>{selectedBill.payment_status || 'Pending Payment'}</strong></div>
                </div>

                {paidConfirmed && (
                  <>
                    <label><span>Payment Method</span><select value={payment.paymentMethod} onChange={(event) => setPayment({ ...payment, paymentMethod: event.target.value })}><option>UPI</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option></select></label>
                    <label><span>Amount</span><input type="number" min="1" required value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} /></label>
                    <label><span>Payment Date</span><input type="date" required value={payment.paymentDate} onChange={(event) => setPayment({ ...payment, paymentDate: event.target.value })} /></label>
                    <label className="portal-field-full"><span>Transaction / UTR Number</span><input required value={payment.transactionId} onChange={(event) => setPayment({ ...payment, transactionId: event.target.value })} placeholder="UPI UTR / reference number" /></label>
                    <label className="portal-field-full"><span>Payment Screenshot Upload</span><input type="file" accept="image/*" onChange={handleScreenshot} /><small>Optional but recommended.</small></label>
                    {payment.screenshotUrl && <img src={payment.screenshotUrl} alt="Payment screenshot preview" className="portal-field-full max-h-48 w-full rounded-lg border border-slate-200 object-contain" />}
                  </>
                )}
              </div>
              <div className="portal-form-actions" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end', gap: '9px', padding: '15px 20px', borderTop: '1px solid var(--portal-line)', background: '#fdfdfd', borderBottomLeftRadius: '14px', borderBottomRightRadius: '14px' }}>
                <button type="button" className="portal-light-btn" onClick={closePayment}>Cancel</button>
                {!paidConfirmed ? (
                  <button type="button" className="portal-primary-btn" onClick={() => setPaidConfirmed(true)}><CreditCard size={14} /> I've Paid</button>
                ) : (
                  <button className="portal-primary-btn" disabled={submitting}><Send size={14} /> {submitting ? 'Submitting...' : 'Submit Payment'}</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentMaintenance;
