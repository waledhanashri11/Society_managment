import React, { useEffect, useMemo, useState } from 'react';
import { Download, Printer, QrCode, ReceiptIndianRupee } from 'lucide-react';
import { maintenanceAPI, settingsAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';
import { downloadPaymentReceiptPdf, printPaymentReceipt, receiptAvailable } from '../utils/paymentReceipt';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const money = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;
const monthName = (month) => new Date(2026, Number(month || 1) - 1).toLocaleDateString('en-IN', { month: 'short' });
const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ResidentPaymentHistory = () => {
  const [bills, setBills] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      maintenanceAPI.getUserMaintenance(),
      settingsAPI.getPayment()
    ]).then((results) => {
      if (results[0].status === 'fulfilled') setBills(unwrap(results[0].value));
      if (results[1].status === 'fulfilled') setPaymentSettings(results[1].value.data || {});
    }).catch(() => {
      notify('Could not load payments data');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const summary = useMemo(() => ({
    paid: bills.filter((bill) => bill.payment_status === 'Paid').length,
    review: bills.filter((bill) => ['Under Review', 'Pending Verification'].includes(bill.payment_status)).length,
    rejected: bills.filter((bill) => bill.rejection_reason || bill.latest_payment_status === 'Rejected' || bill.payment_status === 'Rejected').length,
    pending: bills.filter((bill) => !['Paid', 'Under Review', 'Pending Verification'].includes(bill.payment_status)).length
  }), [bills]);

  const downloadQrCode = () => {
    if (!paymentSettings.paymentQrImage) return notify('No QR code image available');
    
    const link = document.createElement('a');
    link.href = paymentSettings.paymentQrImage;
    link.download = `${paymentSettings.societyName || 'society'}-payment-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getReceipt = async (bill) => {
    if (!bill.payment_id) throw new Error('Receipt payment is unavailable');
    const response = await maintenanceAPI.getPaymentReceipt(bill.payment_id);
    return response.data?.data ?? response.data;
  };

  const printReceipt = async (bill) => {
    try {
      printPaymentReceipt(await getReceipt(bill), paymentSettings);
    } catch (error) {
      notify(error.message === 'Popup blocked' ? 'Popup blocked. Allow popups to print.' : 'Could not load receipt details');
    }
  };

  const downloadReceipt = async (bill) => {
    try {
      await downloadPaymentReceiptPdf(await getReceipt(bill), paymentSettings);
    } catch (error) {
      notify('Could not download the receipt PDF');
    }
  };



  return (
    <div className="portal-module">
      {toast && <div className="resident-toast">{toast}</div>}
      <div className="portal-page-title">
        <div>
          <h1>Payment History</h1>
          <p>Track paid, pending and under-review maintenance payments.</p>
        </div>
      </div>

      {loading ? (
        <>
          <CardSkeleton count={3} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-4">
            <div className="lg:col-span-1 h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
            <section className="portal-panel portal-table-card lg:col-span-2">
              <TableSkeleton rows={5} columns={5} />
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="portal-status-summary" style={{ marginBottom: 20 }}>
            <div><span>Paid</span><strong>{summary.paid}</strong></div>
            <div><span>Under Review</span><strong>{summary.review}</strong></div>
            <div><span>Rejected</span><strong>{summary.rejected}</strong></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: How to Pay Card */}
            <section className="portal-panel lg:col-span-1 p-5 bg-white flex flex-col gap-5">
              <div>
                <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 mb-2" style={{ fontSize: '13px' }}>How to Pay</h2>
                <p className="text-xs text-slate-500">Scan QR and complete payment following the steps below.</p>
              </div>

              {/* QR Code and UPI Details Card */}
              <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                {paymentSettings.paymentQrImage ? (
                  <img 
                    src={paymentSettings.paymentQrImage} 
                    alt="Society Payment QR Code" 
                    className="w-48 h-48 object-contain bg-white border border-slate-100 rounded-lg p-2 shadow-sm"
                  />
                ) : (
                  <div className="w-48 h-48 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg bg-white text-slate-400">
                    <QrCode size={38} />
                    <span className="text-[10px] font-bold text-center px-2">Payment QR not uploaded yet</span>
                  </div>
                )}
                
                <strong className="mt-3 text-xs text-slate-800 text-center font-bold">
                  {paymentSettings.societyName || 'Society Payment'}
                </strong>
                {paymentSettings.paymentUpiId && (
                  <span className="mt-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 select-all" title="Click to select UPI ID">
                    UPI ID: {paymentSettings.paymentUpiId}
                  </span>
                )}

                <button 
                  type="button" 
                  onClick={downloadQrCode} 
                  disabled={!paymentSettings.paymentQrImage}
                  className="portal-primary-btn w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={14} /> Download QR Code
                </button>
              </div>

              {/* Instructions List */}
              <div className="text-xs text-slate-700">
                <h3 className="font-bold text-slate-900 mb-2" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Steps to pay:</h3>
                <ol className="list-decimal pl-4 space-y-2 font-semibold">
                  <li>Download the QR Code or scan it using any UPI app such as Google Pay, PhonePe, Paytm, or another supported UPI app.</li>
                  <li>Enter the exact maintenance amount shown on the maintenance bill.</li>
                  <li>Complete the payment.</li>
                  <li>Copy the UTR / Transaction ID from the successful payment.</li>
                  <li>Upload the payment screenshot as payment proof.</li>
                  <li>Enter the UTR / Transaction ID.</li>
                  <li>Click "Submit Payment".</li>
                </ol>
              </div>

              {/* Warning Message Box */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex gap-2 items-start font-medium">
                <span className="shrink-0 font-bold">⚠️ Warning:</span>
                <span>Please pay the exact amount mentioned in your maintenance bill and upload a clear payment screenshot after completing the transaction.</span>
              </div>
            </section>

            {/* Right Column: Payment History Table */}
            <section className="portal-panel portal-table-card lg:col-span-2">
              <div className="portal-panel-head">
                <div>
                  <h2>Billing & Payment History</h2>
                  <p>View previous invoices and generated payment receipts.</p>
                </div>
                <span className="text-[10px] font-bold text-slate-500">{bills.length} records</span>
              </div>

              {bills.length ? (
                <div className="portal-table-wrap">
                  <table className="portal-data-table">
                    <thead>
                      <tr>
                        <th>Bill</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Due Date</th>
                        <th>Reason</th>
                        <th>Rejected On</th>
                        <th>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill) => (
                        <tr key={bill.id}>
                          <td><strong>{monthName(bill.month)} {bill.year}</strong><div className="portal-muted-text">{bill.bill_number || `BILL-${bill.id}`}</div></td>
                          <td>{money(bill.total_amount)}</td>
                          <td><span className={`portal-status ${String(bill.payment_status).toLowerCase().replace(/\s+/g, '_')}`}>{bill.payment_status}</span></td>
                          <td>{fullDate(bill.due_date)}</td>
                          <td>
                            {bill.rejection_reason ? (
                              <span className="text-xs font-semibold text-red-700">{bill.rejection_reason}</span>
                            ) : (
                              <span className="portal-muted-text">-</span>
                            )}
                          </td>
                          <td>{bill.rejection_reason ? fullDate(bill.rejected_at) : <span className="portal-muted-text">-</span>}</td>
                          <td>
                            {receiptAvailable(bill.payment_status) ? (
                              <div className="portal-row-actions">
                                <button onClick={() => printReceipt(bill)} title="Print Receipt"><Printer size={12} /> Print Receipt</button>
                                <button onClick={() => downloadReceipt(bill)} title="Download PDF"><Download size={12} /> Download PDF</button>
                              </div>
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
        </>
      )}
    </div>
  );
};

export default ResidentPaymentHistory;
