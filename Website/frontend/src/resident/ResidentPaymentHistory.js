import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Printer, QrCode, ReceiptIndianRupee, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { maintenanceAPI, settingsAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';
import { downloadPaymentReceiptPdf, printPaymentReceipt, receiptAvailable, printWriteOffReceipt, downloadWriteOffReceiptPdf } from '../utils/paymentReceipt';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const hasWriteOff = (bill) => Number(bill.write_off_amount || 0) > 0 || Boolean(bill.write_off_status);
const billDisplayAmount = (bill) => hasWriteOff(bill)
  ? bill.total_amount
  : (bill.remainingPayable !== undefined ? bill.remainingPayable : (bill.remaining_amount !== undefined ? bill.remaining_amount : bill.total_amount));
const money = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

const formatMonthDisplay = (month, year) => {
  if (!month) return '—';
  if (isNaN(Number(month))) return `${month} ${year || ''}`.trim();
  return `${new Date(2026, Number(month) - 1).toLocaleDateString('en-IN', { month: 'short' })} ${year || ''}`.trim();
};

const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ResidentPaymentHistory = () => {
  const { t } = useTranslation();
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

  return (
    <div className="portal-module">
      {toast && <div className="resident-toast">{toast}</div>}
      <div className="portal-page-title">
        <div>
          <h1>{t('payHistory.title', 'Payment History')}</h1>
          <p>{t('payHistory.subtitle', 'Track paid, pending and under-review maintenance payments.')}</p>
        </div>
        <div className="portal-date-chip">
          <ReceiptIndianRupee size={15} /> Payment Records
        </div>
      </div>

      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="portal-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '12px', marginBottom: '16px' }}>
            <div className="portal-kpi green">
              <span>{t('payHistory.paid', 'Paid Payments')}</span>
              <strong>{summary.paid}</strong>
              <small>Verified receipts</small>
              <div className="portal-kpi-icon"><CheckCircle2 size={18} /></div>
            </div>
            <div className="portal-kpi" style={{ borderColor: '#bfdbfe' }}>
              <span>{t('payHistory.underReview', 'Under Review')}</span>
              <strong style={{ color: '#2563eb' }}>{summary.review}</strong>
              <small>Admin verification</small>
              <div className="portal-kpi-icon" style={{ color: '#2563eb', background: '#eff6ff' }}><Clock size={18} /></div>
            </div>
            <div className="portal-kpi orange">
              <span>{t('payHistory.pending', 'Pending Dues')}</span>
              <strong>{summary.pending}</strong>
              <small>Unpaid bills</small>
              <div className="portal-kpi-icon"><AlertTriangle size={18} /></div>
            </div>
            <div className="portal-kpi red">
              <span>{t('payHistory.rejected', 'Rejected Payments')}</span>
              <strong>{summary.rejected}</strong>
              <small>Payment issues</small>
              <div className="portal-kpi-icon"><XCircle size={18} /></div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Payment History Table (Full Width) */}
            <section className="portal-panel portal-table-card">
              <div className="portal-panel-head">
                <div>
                  <h2>{t('payHistory.historyTitle', 'Billing & Payment History')}</h2>
                  <p>{t('payHistory.historySubtitle', 'View previous invoices and generated payment receipts.')}</p>
                </div>
                <span className="portal-date-chip" style={{ fontSize: '10px' }}>{bills.length} Records</span>
              </div>

              {bills.length ? (
                <div className="portal-table-wrap">
                  <table className="portal-data-table">
                    <thead>
                      <tr>
                        <th>{t('payHistory.colBill', 'BILL')}</th>
                        <th>{t('payHistory.colAmount', 'AMOUNT')}</th>
                        <th>{t('payHistory.colStatus', 'STATUS')}</th>
                        <th>{t('payHistory.colDueDate', 'DUE DATE')}</th>
                        <th>{t('payHistory.colReason', 'REJECTION REASON')}</th>
                        <th style={{ textAlign: 'center' }}>{t('payHistory.colReceipt', 'RECEIPT & ACTIONS')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill) => (
                        <tr key={bill.id}>
                          <td>
                            <strong>{formatMonthDisplay(bill.month, bill.year)}</strong>
                            <div className="portal-muted-text">{bill.bill_number || `BILL-${bill.id}`}</div>
                          </td>
                          <td><strong>{money(billDisplayAmount(bill))}</strong></td>
                          <td>
                            <span className={`portal-status ${bill.payment_status === 'Paid' ? 'resolved' : bill.payment_status === 'Overdue' ? 'rejected' : 'pending'}`}>
                              {t(`statusLabel.${bill.payment_status}`, bill.write_off_status || bill.payment_status)}
                            </span>
                          </td>
                          <td>{fullDate(bill.due_date)}</td>
                          <td>
                            {bill.rejection_reason || bill.rejectionReason || bill.remarks ? (
                              <div style={{ color: '#b91c1c', fontWeight: '700', fontSize: '11px', background: '#fef2f2', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                                ⚠️ {bill.rejection_reason || bill.rejectionReason || bill.remarks}
                              </div>
                            ) : (
                              <span className="portal-muted-text">—</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {hasWriteOff(bill) ? (
                              <div className="portal-row-actions" style={{ justifyContent: 'center', gap: '6px' }}>
                                <button 
                                  style={{ color: '#087d40', background: '#e8f8ef', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}
                                  onClick={() => handlePrintWriteOffReceipt(bill)} 
                                  title="Print Receipt"
                                >
                                  <Printer size={12} /> {t('payHistory.printReceipt', 'Print Receipt')}
                                </button>
                                <button 
                                  style={{ color: '#334155', background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}
                                  onClick={() => handleDownloadWriteOffReceipt(bill)} 
                                  title="Download PDF"
                                >
                                  <Download size={12} /> {t('payHistory.downloadPdf', 'Download PDF')}
                                </button>
                              </div>
                            ) : receiptAvailable(bill.payment_status) ? (
                              <div className="portal-row-actions" style={{ justifyContent: 'center', gap: '6px' }}>
                                <button 
                                  style={{ color: '#087d40', background: '#e8f8ef', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}
                                  onClick={() => printReceipt(bill)} 
                                  title="Print Receipt"
                                >
                                  <Printer size={12} /> {t('payHistory.printReceipt', 'Print Receipt')}
                                </button>
                                <button 
                                  style={{ color: '#334155', background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}
                                  onClick={() => downloadReceipt(bill)} 
                                  title="Download PDF"
                                >
                                  <Download size={12} /> {t('payHistory.downloadPdf', 'Download PDF')}
                                </button>
                              </div>
                            ) : (
                              <span className="portal-muted-text">{t('payHistory.notPaidYet', 'Not paid yet')}</span>
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
                  {t('payHistory.noHistory', 'No payment history available yet.')}
                </div>
              )}
            </section>

            {/* Bottom Panel: How to Pay / QR Code Guide */}
            <section className="portal-panel">
              <div className="portal-panel-head">
                <div>
                  <h2>{t('payHistory.howToPay', 'Society Payment QR Code & Instructions')}</h2>
                  <p>{t('payHistory.howToPayDesc', 'Scan official society QR code using any UPI app to settle dues.')}</p>
                </div>
              </div>
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'center' }}>
                {/* Left: QR Code Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  {paymentSettings.paymentQrImage ? (
                    <img 
                      src={paymentSettings.paymentQrImage} 
                      alt="Society Payment QR Code" 
                      style={{ width: '160px', height: '160px', objectFit: 'contain', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px' }}
                    />
                  ) : (
                    <div style={{ width: '160px', height: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', borderRadius: '8px', background: 'white', color: '#94a3b8', gap: '6px' }}>
                      <QrCode size={36} />
                      <span style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center', padding: '0 8px' }}>{t('payHistory.qrNotUploaded', 'QR code not uploaded')}</span>
                    </div>
                  )}

                  <strong style={{ fontSize: '12px', color: '#0f172a', fontWeight: '800' }}>
                    {paymentSettings.societyName || 'Society Payment'}
                  </strong>
                  {paymentSettings.paymentUpiId && (
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', background: 'white', padding: '4px 10px', borderRadius: '99px', border: '1px solid #cbd5e1' }}>
                      UPI ID: {paymentSettings.paymentUpiId}
                    </span>
                  )}

                  <button 
                    type="button" 
                    onClick={downloadQrCode} 
                    disabled={!paymentSettings.paymentQrImage}
                    className="portal-primary-btn"
                    style={{ background: 'linear-gradient(90deg, #087d40, #0ab35c)', padding: '6px 14px', fontSize: '11px', width: '100%', marginTop: '4px' }}
                  >
                    <Download size={13} /> {t('payHistory.downloadQr', 'Download QR Code')}
                  </button>
                </div>

                {/* Right: Instructions List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                    {t('payHistory.stepsToPay', 'Steps to Pay via UPI:')}
                  </h3>
                  <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#475569', lineHeight: '1.8' }}>
                    <li>{t('payHistory.step1', 'Download or scan the QR code using any UPI app (GPay, PhonePe, Paytm).')}</li>
                    <li>{t('payHistory.step2', 'Enter the exact maintenance bill total amount.')}</li>
                    <li>{t('payHistory.step3', 'Complete the transaction.')}</li>
                    <li>{t('payHistory.step4', 'Copy the 12-digit UTR / Transaction reference number.')}</li>
                    <li>{t('payHistory.step5', 'Go to Maintenance page to submit the payment with UTR and receipt screenshot.')}</li>
                  </ol>

                  <div style={{ padding: '10px 14px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', fontSize: '11px', color: '#873800' }}>
                    <strong>⚠️ {t('payHistory.warning', 'Important Notice:')}</strong> {t('payHistory.warningDesc', 'Please pay the exact amount mentioned in your maintenance bill to ensure automated verification.')}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default ResidentPaymentHistory;
