/* eslint-disable */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  Landmark,
  Lock,
  RefreshCw,
  ShieldCheck,
  User
} from 'lucide-react';

import { residentAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';

const money = (value) => `₹ ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
const moneyShort = (value) => `₹ ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatResidentStatus = (status) => {
  const s = String(status || '').toUpperCase();
  if (s.includes('WRITE') || s.includes('WRITTEN')) return 'Paid';
  return status || 'Pending';
};

const getCurrentIndianFY = () => {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const start = m >= 4 ? y : y - 1;
  return `${start}-${start + 1}`;
};

export default function ResidentReports() {
  const { t } = useTranslation();
  const [financialYear, setFinancialYear] = useState(getCurrentIndianFY());
  const [activeTab, setActiveTab] = useState('myAccount'); // 'myAccount' | 'transparency'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [accountData, setAccountData] = useState(null);
  const [transparencyData, setTransparencyData] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [accRes, transRes] = await Promise.all([
        residentAPI.getAccountSummaryReport({ financialYear }),
        residentAPI.getSocietyTransparencyReport({ financialYear })
      ]);

      setAccountData(accRes.data?.data || accRes.data);
      setTransparencyData(transRes.data?.data || transRes.data);
    } catch (err) {
      console.error('Error fetching resident reports:', err);
      setError(err.response?.data?.message || 'Could not load report data from server.');
    } finally {
      setLoading(false);
    }
  }, [financialYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exportPdf = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('resident-report-content');
      if (!element) return alert('Report content not found');

      const opt = {
        margin: 8,
        filename: `Resident_Report_${financialYear}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF export failed:', err);
      window.print();
    }
  };

  const accSummary = accountData?.summary || {};
  const resident = accountData?.resident || {};
  const transSummary = transparencyData?.summary || {};

  return (
    <div className="portal-module" style={{ width: '100%' }}>
      {/* Page Title */}
      <div className="portal-page-title">
        <div>
          <h1>Resident Account & Society Transparency Reports</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 0' }}>
            <ShieldCheck size={14} style={{ color: '#079447' }} />
            Privacy-enforced report: Personal payment statement + Society financial transparency
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
          {/* FY Picker */}
          <div className="portal-date-chip" style={{ padding: '6px 8px' }}>
            <Calendar size={13} />
            <span>FY:</span>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              style={{ border: 0, outline: 'none', background: 'transparent', fontWeight: 700, cursor: 'pointer', fontSize: '11px' }}
            >
              {['2026-2027', '2025-2026', '2024-2025'].map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>
          </div>

          <button onClick={loadData} className="portal-light-btn" style={{ padding: '7px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>

          <button onClick={exportPdf} className="portal-primary-btn" style={{ background: '#079447', padding: '7px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}>
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="portal-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { id: 'myAccount', label: 'My Account Statement', icon: User },
          { id: 'transparency', label: 'Society Financial Transparency', icon: Landmark }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 15px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 700,
                border: 0,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                color: isActive ? '#ffffff' : '#475467',
                background: isActive ? (tab.id === 'myAccount' ? '#079447' : '#1473e6') : '#f2f4f7',
                boxShadow: isActive ? `0 4px 14px ${tab.id === 'myAccount' ? 'rgba(7, 148, 71, 0.25)' : 'rgba(20, 115, 230, 0.25)'}` : 'none',
                transition: 'all 0.16s ease'
              }}
            >
              {Icon ? <Icon size={14} /> : null}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div id="resident-report-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          <>
            {/* 1. MY ACCOUNT STATEMENT */}
            {activeTab === 'myAccount' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Account Formula Cards */}
                <div className="portal-kpis">
                  {/* Closing Dues */}
                  <article className="portal-kpi green" style={{ background: 'linear-gradient(135deg, #079447, #05783b)', color: '#ffffff' }}>
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>CLOSING OUTSTANDING DUES</span>
                    <strong style={{ color: '#ffffff' }}>{money(accSummary.closingOutstanding)}</strong>
                    <small style={{ color: 'rgba(255,255,255,0.9)', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 4 }}>
                      Resident: {resident.name || 'Resident'} | Flat {resident.flatNo || '—'}
                    </small>
                  </article>

                  {/* Bills Generated */}
                  <article className="portal-kpi">
                    <span>BILLS GENERATED</span>
                    <strong>{money(accSummary.billsGenerated)}</strong>
                    <small style={{ color: '#687588' }}>Penalties: {moneyShort(accSummary.totalPenalty)}</small>
                    <div className="portal-kpi-icon"><CreditCard size={16} /></div>
                  </article>

                  {/* Approved Payments */}
                  <article className="portal-kpi green">
                    <span>APPROVED PAYMENTS</span>
                    <strong style={{ color: '#079447' }}>+{money(accSummary.approvedPayments)}</strong>
                    <small style={{ color: '#dd6b20' }}>Pending Verification: {accSummary.verificationPendingCount || 0} payments</small>
                    <div className="portal-kpi-icon"><CheckCircle2 size={16} /></div>
                  </article>
                </div>

                {/* Personal Maintenance Bills Table */}
                <div className="portal-panel portal-table-card">
                  <div className="portal-panel-head">
                    <div>
                      <h2>My Maintenance Bills Statement (FY {financialYear})</h2>
                      <p>Detailed breakdown of your generated maintenance bills, payments, and balances</p>
                    </div>
                  </div>

                  <div className="portal-table-wrap">
                    <table className="portal-data-table">
                      <thead>
                        <tr>
                          <th>Bill Date / Period</th>
                          <th>Bill Amount</th>
                          <th style={{ color: '#dd6b20' }}>Penalty</th>
                          <th style={{ color: '#7a5af8' }}>Write-Off Discount</th>
                          <th style={{ color: '#079447' }}>Paid Amount</th>
                          <th style={{ color: '#dc2626' }}>Pending Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(accountData?.bills || []).map((bill, idx) => {
                          const statusText = formatResidentStatus(bill.status);
                          const isPaid = String(statusText).toLowerCase() === 'paid';
                          return (
                            <tr key={idx}>
                              <td>
                                <strong>Month {bill.month} / {bill.year}</strong>
                                <small style={{ display: 'block', color: '#687588' }}>Due: {formatDate(bill.due_date)}</small>
                              </td>
                              <td><strong>{moneyShort(bill.bill_amount)}</strong></td>
                              <td style={{ color: '#dd6b20', fontWeight: 600 }}>{moneyShort(bill.penalty_amount || bill.penalty || 0)}</td>
                              <td style={{ color: '#7a5af8', fontWeight: 600 }}>{moneyShort(bill.write_off_amount || bill.writeoff_amount || 0)}</td>
                              <td style={{ color: '#079447', fontWeight: 700 }}>{moneyShort(bill.paid_amount)}</td>
                              <td style={{ color: '#dc2626', fontWeight: 700 }}>{moneyShort(bill.pending_amount)}</td>
                              <td>
                                <span className={`portal-status ${isPaid ? 'paid' : 'pending'}`}>
                                  {statusText}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. SOCIETY FINANCIAL TRANSPARENCY */}
            {activeTab === 'transparency' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Privacy Badge Banner */}
                <div className="portal-panel" style={{ padding: '14px 18px', background: '#eaf3ff', borderColor: '#c7d7ea', color: '#0f3d68', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Lock size={18} style={{ color: '#1473e6', flexShrink: 0 }} />
                  <span style={{ fontSize: 12 }}>
                    <strong>Privacy Protected:</strong> Personal phone numbers, email addresses, bank accounts, UPI IDs, documents, and screenshots are strictly hidden to ensure security compliance.
                  </span>
                </div>

                {/* Society Summary Grid */}
                <div className="portal-kpis">
                  <article className="portal-kpi">
                    <span>SOCIETY TOTAL OPENING</span>
                    <strong>{money(transSummary.totalOpening)}</strong>
                    <small style={{ color: '#687588' }}>Bank: {moneyShort(transSummary.bankOpening)} | Cash: {moneyShort(transSummary.cashOpening)}</small>
                    <div className="portal-kpi-icon"><Landmark size={16} /></div>
                  </article>

                  <article className="portal-kpi green">
                    <span>APPROVED SOCIETY INCOME</span>
                    <strong style={{ color: '#079447' }}>{money(transSummary.totalIncome)}</strong>
                    <small style={{ color: '#687588' }}>Bank: {moneyShort(transSummary.bankIncome)} | Cash: {moneyShort(transSummary.cashIncome)}</small>
                    <div className="portal-kpi-icon"><CheckCircle2 size={16} /></div>
                  </article>

                  <article className="portal-kpi red">
                    <span>APPROVED SOCIETY EXPENSE</span>
                    <strong style={{ color: '#dc2626' }}>{money(transSummary.totalExpense)}</strong>
                    <small style={{ color: '#687588' }}>Bank: {moneyShort(transSummary.bankExpense)} | Cash: {moneyShort(transSummary.cashExpense)}</small>
                    <div className="portal-kpi-icon"><AlertTriangle size={16} /></div>
                  </article>

                  <article className="portal-kpi">
                    <span>SOCIETY CLOSING BALANCE</span>
                    <strong style={{ color: '#1473e6' }}>{money(transSummary.totalClosing)}</strong>
                    <small style={{ color: '#687588' }}>Bank: {moneyShort(transSummary.bankClosing)} | Cash: {moneyShort(transSummary.cashClosing)}</small>
                    <div className="portal-kpi-icon"><Landmark size={16} /></div>
                  </article>
                </div>

                {/* Approved Expenses Transparency Table */}
                <div className="portal-panel portal-table-card">
                  <div className="portal-panel-head">
                    <div>
                      <h2>Approved Society Expenses (Transparency View)</h2>
                      <p>Read-only transparent log of verified society expenses</p>
                    </div>
                  </div>

                  <div className="portal-table-wrap">
                    <table className="portal-data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Vendor</th>
                          <th style={{ color: '#dc2626' }}>Amount</th>
                          <th>Account</th>
                          <th>Approved By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(transparencyData?.approvedExpenses || []).map((exp, idx) => (
                          <tr key={idx}>
                            <td>{formatDate(exp.expense_date)}</td>
                            <td><strong>{exp.category}</strong></td>
                            <td className="portal-truncate">{exp.description}</td>
                            <td>{exp.vendor}</td>
                            <td style={{ color: '#dc2626', fontWeight: 700 }}>-{moneyShort(exp.amount)}</td>
                            <td><strong style={{ color: '#1473e6', fontSize: 11 }}>{exp.payment_account || 'BANK'}</strong></td>
                            <td style={{ color: '#687588' }}>{exp.approved_by || 'Management'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Flat Payment Status Transparency Table */}
                <div className="portal-panel portal-table-card">
                  <div className="portal-panel-head">
                    <div>
                      <h2>Flat Maintenance Collection Status (Sanitized View)</h2>
                      <p>Sanitized payment status across all flats without sensitive personal details</p>
                    </div>
                  </div>

                  <div className="portal-table-wrap">
                    <table className="portal-data-table">
                      <thead>
                        <tr>
                          <th>Flat & Wing</th>
                          <th>Bill Month</th>
                          <th>Bill Amount</th>
                          <th style={{ color: '#dd6b20' }}>Penalty</th>
                          <th style={{ color: '#079447' }}>Paid Amount</th>
                          <th style={{ color: '#dc2626' }}>Pending Amount</th>
                          <th>Status</th>
                          <th>Payment Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(transparencyData?.flatPayments || []).map((row, idx) => {
                          const statusText = formatResidentStatus(row.status);
                          const isPaid = String(statusText).toLowerCase() === 'paid';
                          return (
                            <tr key={idx}>
                              <td>
                                <strong>Wing {row.wing} - {row.flat_no}</strong>
                              </td>
                              <td>Month {row.month}</td>
                              <td><strong>{moneyShort(row.bill_amount)}</strong></td>
                              <td style={{ color: '#dd6b20', fontWeight: 600 }}>{moneyShort(row.penalty_amount || row.penalty || 0)}</td>
                              <td style={{ color: '#079447', fontWeight: 700 }}>{moneyShort(row.paid_amount)}</td>
                              <td style={{ color: '#dc2626', fontWeight: 700 }}>{moneyShort(row.pending_amount)}</td>
                              <td>
                                <span className={`portal-status ${isPaid ? 'paid' : 'pending'}`}>
                                  {statusText}
                                </span>
                              </td>
                              <td style={{ color: '#687588' }}>{formatDate(row.payment_date || row.paymentDate || row.paid_at || row.paidAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
