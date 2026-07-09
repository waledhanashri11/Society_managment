import React, { useEffect, useMemo, useState } from 'react';
import { Download, ReceiptIndianRupee } from 'lucide-react';
import { maintenanceAPI } from '../services/api';
import { getUser } from '../utils/auth';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const money = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;
const monthName = (month) => new Date(2026, Number(month || 1) - 1).toLocaleDateString('en-IN', { month: 'short' });
const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ResidentPaymentHistory = () => {
  const user = getUser();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  useEffect(() => {
    maintenanceAPI.getUserMaintenance()
      .then((response) => setBills(unwrap(response)))
      .catch(() => notify('Could not load payment history'))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => ({
    paid: bills.filter((bill) => bill.payment_status === 'Paid').length,
    review: bills.filter((bill) => bill.payment_status === 'Under Review').length,
    pending: bills.filter((bill) => bill.payment_status !== 'Paid' && bill.payment_status !== 'Under Review').length
  }), [bills]);

  const printReceipt = (bill) => {
    const html = `
      <html><head><title>Payment Receipt</title><style>
      body{font-family:Arial,sans-serif;padding:32px;color:#172033}.box{max-width:760px;margin:0 auto;border:1px solid #dfe5ee;border-radius:14px;padding:28px}
      h1{margin:0;font-size:26px}.muted{color:#667085;margin-top:6px}table{width:100%;border-collapse:collapse;margin-top:24px}
      td,th{border-bottom:1px solid #edf0f3;padding:12px;text-align:left}.total{font-size:22px;font-weight:800}.right{text-align:right}
      </style></head><body><div class="box">
      <h1>Payment Receipt</h1><div class="muted">Society Management System</div>
      <table>
      <tr><th>Bill No.</th><td>${bill.bill_number || `BILL-${bill.id}`}</td></tr>
      <tr><th>Resident</th><td>${user?.name || 'Resident'}</td></tr>
      <tr><th>Flat</th><td>${bill.flat_no || ''}</td></tr>
      <tr><th>Period</th><td>${monthName(bill.month)} ${bill.year || ''}</td></tr>
      <tr><th>Status</th><td>${bill.payment_status}</td></tr>
      <tr><th>Paid Amount</th><td>${money(bill.paid_amount || bill.total_amount)}</td></tr>
      <tr><th class="total">Total</th><td class="total">${money(bill.total_amount)}</td></tr>
      </table><p class="muted right">Generated on ${new Date().toLocaleString('en-IN')}</p>
      </div><script>window.print();</script></body></html>`;
    const docWindow = window.open('', '_blank', 'width=900,height=700');
    if (!docWindow) return notify('Popup blocked. Allow popups to print.');
    docWindow.document.write(html);
    docWindow.document.close();
  };

  if (loading) return <div className="loading-spinner">Loading payment history...</div>;

  return (
    <div className="portal-module">
      {toast && <div className="resident-toast">{toast}</div>}
      <div className="portal-page-title">
        <div>
          <h1>Payment History</h1>
          <p>Track paid, pending and under-review maintenance payments.</p>
        </div>
      </div>

      <div className="portal-status-summary" style={{ marginBottom: 14 }}>
        <div><span>Paid</span><strong>{summary.paid}</strong></div>
        <div><span>Under Review</span><strong>{summary.review}</strong></div>
        <div><span>Pending</span><strong>{summary.pending}</strong></div>
      </div>

      <section className="portal-panel portal-table-card">
        {bills.length ? (
          <div className="portal-table-wrap">
            <table className="portal-data-table">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id}>
                    <td><strong>{monthName(bill.month)} {bill.year}</strong><div className="portal-muted-text">{bill.bill_number || `BILL-${bill.id}`}</div></td>
                    <td>{money(bill.total_amount)}</td>
                    <td><span className={`portal-status ${String(bill.payment_status).toLowerCase().replace(' ', '_')}`}>{bill.payment_status}</span></td>
                    <td>{fullDate(bill.due_date)}</td>
                    <td>
                      {bill.payment_status === 'Paid' ? (
                        <button className="portal-light-btn" onClick={() => printReceipt(bill)}><Download size={14} /> Receipt</button>
                      ) : (
                        <span className="portal-muted-text">Not paid yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="portal-empty">
            <ReceiptIndianRupee size={26} /><br />
            No payment history available yet.
          </div>
        )}
      </section>
    </div>
  );
};

export default ResidentPaymentHistory;
