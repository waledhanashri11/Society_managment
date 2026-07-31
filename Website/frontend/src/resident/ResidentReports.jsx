/* eslint-disable */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Landmark,
  Lock,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Wallet,
  WalletCards,
  BarChart3,
  Filter,
  Receipt
} from 'lucide-react';

import { maintenanceAPI, residentAPI, monthlyReportAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';

const money = (value) => `₹ ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
const moneyShort = (value) => `₹ ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
const num = (value) => Number(value || 0);

const SafeIcon = ({ icon: Comp, size = 16, className, style, ...props }) => {
  if (!Comp || (typeof Comp !== 'function' && typeof Comp !== 'object')) return null;
  return <Comp size={size} className={className} style={style} {...props} />;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatMonthName = (month) => {
  if (!month) return '—';
  if (typeof month === 'number') return MONTH_NAMES[month - 1] || `Month ${month}`;
  if (typeof month === 'string' && /^\d+$/.test(month.trim())) {
    const nVal = parseInt(month.trim(), 10);
    return MONTH_NAMES[nVal - 1] || month;
  }
  return month;
};

const formatDate = (dateStr) => {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return '—';
  let d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    } else if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 2) {
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
  }
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
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

const financialYearsList = [
  '2026-2027',
  '2025-2026',
  '2024-2025'
];

const getResidentBillAmounts = (r) => {
  const writeOff = num(r.write_off_amount || r.writeoff_amount || r.writeOffAmount || 0);
  const rawPaid = num(r.paid_amount || r.paidAmount || 0);
  const rawPending = num(r.outstanding_amount || r.pending_amount || r.pendingAmount || r.remaining_amount || r.remainingAmount || 0);
  const billAmt = num(r.maintenance_amount || r.bill_amount || r.billAmount || r.amount || r.total_amount || 0);
  const penaltyAmt = num(r.penalty || r.penalty_amount || r.late_fee || 0);
  const discountAmt = num(r.discount_amount || r.discount || 0);
  const totalPayableAmt = num(r.total_payable !== undefined ? r.total_payable : Math.max(0, billAmt + penaltyAmt - discountAmt));

  const displayPaid = rawPaid + writeOff;
  const displayPending = Math.max(0, rawPending > 0 ? (rawPending - writeOff) : (totalPayableAmt - displayPaid));
  const isPaid = displayPending <= 0;
  let statusText = isPaid ? 'Paid' : (displayPaid > 0 ? 'Partial' : 'Pending');

  if (r.calculated_status || r.status) {
    const sStr = String(r.calculated_status || r.status).toLowerCase();
    if (isPaid) statusText = 'Paid';
    else if (sStr.includes('paid')) statusText = 'Paid';
    else if (sStr.includes('part')) statusText = 'Partial';
    else if (sStr.includes('overdue')) statusText = 'Overdue';
  }

  return {
    billAmt,
    penaltyAmt,
    discountAmt,
    totalPayableAmt,
    displayPaid,
    displayPending,
    isPaid,
    statusText
  };
};

export default function ResidentReports() {
  const { t } = useTranslation();
  const [financialYear, setFinancialYear] = useState(getCurrentIndianFY());
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'monthlyReport' | 'expenses' | 'bankLedger' | 'cashLedger' | 'flats' | 'myAccount'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters for Monthly Maintenance Report tab
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');

  // Data states matching Admin Reports
  const [finData, setFinData] = useState(null);
  const [bankLedger, setBankLedger] = useState(null);
  const [cashLedger, setCashLedger] = useState(null);
  const [flatReport, setFlatReport] = useState([]);
  const [monthlyReportData, setMonthlyReportData] = useState([]);
  const [expensesList, setExpensesList] = useState([]);
  const [accountData, setAccountData] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [finRes, bankRes, cashRes, flatRes, expensesRes, accRes, monthlyRes] = await Promise.allSettled([
        maintenanceAPI.getFinancialReport({ financialYear }),
        maintenanceAPI.getBankLedger({ financialYear }),
        maintenanceAPI.getCashLedger({ financialYear }),
        maintenanceAPI.getFlatCollectionReport({ financialYear }),
        residentAPI.getReportExpenses({ financialYear }),
        residentAPI.getAccountSummaryReport({ financialYear }),
        monthlyReportAPI.getMonthlyReport({ financialYear })
      ]);

      if (finRes.status === 'fulfilled') {
        const d = finRes.value.data?.data || finRes.value.data;
        setFinData(d);
        if (d?.approvedExpenses && Array.isArray(d.approvedExpenses) && d.approvedExpenses.length > 0) {
          setExpensesList(d.approvedExpenses);
        }
      }
      if (bankRes.status === 'fulfilled') setBankLedger(bankRes.value.data?.data || bankRes.value.data);
      if (cashRes.status === 'fulfilled') setCashLedger(cashRes.value.data?.data || cashRes.value.data);
      if (flatRes.status === 'fulfilled') {
        const raw = flatRes.value.data;
        const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setFlatReport(arr);
      }
      if (monthlyRes.status === 'fulfilled') {
        const raw = monthlyRes.value.data;
        const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setMonthlyReportData(arr);
      }
      if (expensesRes.status === 'fulfilled') {
        const raw = expensesRes.value.data;
        const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        if (arr.length > 0) setExpensesList(arr);
      }
      if (accRes.status === 'fulfilled') setAccountData(accRes.value.data?.data || accRes.value.data);
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

  // Derived financial summary matching Admin Reports exactly
  const summaryData = useMemo(() => {
    const s = finData?.summary || finData || {};
    return {
      totalOpening: num(s.totalOpening !== undefined ? s.totalOpening : (num(s.bankOpening) + num(s.cashOpening))),
      bankOpening: num(s.bankOpening),
      cashOpening: num(s.cashOpening),
      totalIncome: num(s.totalIncome),
      bankIncome: num(s.bankIncome),
      cashIncome: num(s.cashIncome),
      totalExpenses: num(s.totalExpenses !== undefined ? s.totalExpenses : s.totalExpense),
      bankExpenses: num(s.bankExpenses !== undefined ? s.bankExpenses : s.bankExpense),
      cashExpenses: num(s.cashExpenses !== undefined ? s.cashExpenses : s.cashExpense),
      totalClosing: num(s.totalClosing !== undefined ? s.totalClosing : (num(s.bankClosing) + num(s.cashClosing))),
      bankClosing: num(s.bankClosing),
      cashClosing: num(s.cashClosing),
      netSurplus: num(s.netSurplus !== undefined ? s.netSurplus : (num(s.totalIncome) - num(s.totalExpenses)))
    };
  }, [finData]);

  // Derived personal summary
  const accSummary = useMemo(() => {
    const s = accountData?.summary || {};
    return {
      openingBalance: num(s.opening_balance || s.openingBalance),
      billsGenerated: num(s.bills_generated || s.billsGenerated),
      totalPenalty: num(s.total_penalty || s.totalPenalty),
      approvedPayments: num(s.approved_payments || s.approvedPayments),
      closingOutstanding: num(s.closing_outstanding || s.closingOutstanding),
      verificationPendingCount: num(s.verification_pending_count || s.verificationPendingCount)
    };
  }, [accountData]);

  const residentInfo = accountData?.resident || {};

  // Filtered flat collection records for Monthly Maintenance Report tab
  const filteredFlatPayments = useMemo(() => {
    const primaryList = Array.isArray(monthlyReportData) && monthlyReportData.length > 0 ? monthlyReportData : flatReport;
    const list = Array.isArray(primaryList) ? primaryList : (Array.isArray(primaryList?.data) ? primaryList.data : []);
    return list.filter((r) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch = !q ||
        String(r.flatNo || r.flat_no || '').toLowerCase().includes(q) ||
        String(r.wing || '').toLowerCase().includes(q) ||
        String(r.residentName || r.resident_name || '').toLowerCase().includes(q);

      const statusUpper = String(r.calculated_status || r.status || '').toUpperCase();
      let matchStatus = true;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PAID') matchStatus = statusUpper.includes('PAID');
        else if (statusFilter === 'PENDING') matchStatus = statusUpper.includes('PENDING') || statusUpper.includes('OVERDUE');
      }

      const methodUpper = String(r.payment_mode || r.paymentMethod || r.payment_method || '').toUpperCase();
      let matchMethod = true;
      if (methodFilter !== 'ALL') {
        matchMethod = methodUpper.includes(methodFilter);
      }

      return matchSearch && matchStatus && matchMethod;
    });
  }, [monthlyReportData, flatReport, searchTerm, statusFilter, methodFilter]);

  const printReport = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('resident-report-content');
      if (!element) return alert('Report content not found');

      const opt = {
        margin: 8,
        filename: `Society_Financial_Report_${financialYear}.pdf`,
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

  return (
    <div className="portal-module">
      {/* Page Title & Actions (Exact match for Admin Reports) */}
      <div className="portal-page-title">
        <div>
          <h1>Society Financial & Maintenance Reports</h1>
          <p>Comprehensive Month-Wise & Year-Wise Collection, Resident Ledger & Verification System</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '8px' }}>
            <Calendar size={14} style={{ color: '#1473e6' }} />
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              style={{ border: 0, outline: 0, fontWeight: 700, fontSize: '11px', background: 'transparent', cursor: 'pointer', color: '#1e293b' }}
            >
              {financialYearsList.map((fy) => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>

          <button onClick={loadData} className="portal-light-btn" style={{ padding: '7px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>

          <button onClick={printReport} className="portal-primary-btn" style={{ padding: '7px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}>
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="portal-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs (Pill style - Exact match for Admin Reports) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {[
          { id: 'summary', label: 'Financial Accounting Summary', icon: WalletCards },
          { id: 'monthlyReport', label: 'Monthly Maintenance Report', icon: BarChart3 },
          { id: 'expenses', label: 'Expense Report', icon: Wallet },
          { id: 'bankLedger', label: 'Bank Account Ledger', icon: Landmark },
          { id: 'cashLedger', label: 'Cash Account Ledger', icon: WalletCards },
          { id: 'myAccount', label: 'My Personal Account Statement', icon: User }
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
                gap: '7px',
                padding: '8px 15px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
                border: 0,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                color: isActive ? '#ffffff' : '#475467',
                background: isActive ? '#1473e6' : '#f2f4f7',
                boxShadow: isActive ? '0 4px 14px rgba(20, 115, 230, 0.25)' : 'none',
                transition: 'all 0.16s ease'
              }}
            >
              <SafeIcon icon={Icon} size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div id="resident-report-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {loading ? (
          <div className="portal-panel" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" /><br />Loading financial reports...
          </div>
        ) : (
          <>
            {/* TAB 1: FINANCIAL ACCOUNTING SUMMARY (Matches Admin Reports Exactly) */}
            {activeTab === 'summary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 5 KPI Cards Grid */}
                <div className="portal-kpis">
                  <article className="portal-kpi">
                    <span>TOTAL CLOSING BALANCE</span>
                    <strong>{money(summaryData.totalClosing)}</strong>
                    <small style={{ color: '#687588' }}>Total Financial Closing</small>
                    <div className="portal-kpi-icon"><Landmark size={16} /></div>
                  </article>

                  <article className="portal-kpi blue">
                    <span>BANK CLOSING BALANCE</span>
                    <strong style={{ color: '#1473e6' }}>{money(summaryData.bankClosing)}</strong>
                    <small style={{ color: '#687588' }}>Bank Account Balance</small>
                    <div className="portal-kpi-icon"><Landmark size={16} /></div>
                  </article>

                  <article className="portal-kpi green">
                    <span>CASH CLOSING BALANCE</span>
                    <strong style={{ color: '#079447' }}>{money(summaryData.cashClosing)}</strong>
                    <small style={{ color: '#687588' }}>Cash Account Balance</small>
                    <div className="portal-kpi-icon"><WalletCards size={16} /></div>
                  </article>

                  <article className="portal-kpi red">
                    <span>TOTAL EXPENSES</span>
                    <strong style={{ color: '#dc2626' }}>{money(summaryData.totalExpenses)}</strong>
                    <small style={{ color: '#687588' }}>Total Operational Expenses</small>
                    <div className="portal-kpi-icon"><Wallet size={16} /></div>
                  </article>

                  <article className="portal-kpi">
                    <span>NET SURPLUS / DEFICIT</span>
                    <strong style={{ color: summaryData.netSurplus >= 0 ? '#079447' : '#dc2626' }}>{money(summaryData.netSurplus)}</strong>
                    <small style={{ color: '#687588' }}>{summaryData.netSurplus >= 0 ? 'Net Surplus' : 'Net Deficit'}</small>
                    <div className="portal-kpi-icon"><IndianRupee size={16} /></div>
                  </article>
                </div>

                {/* Month-Wise Financial Accounting Breakdown Table (Exact match for Admin Reports) */}
                <div className="portal-panel portal-table-card">
                  <div className="portal-panel-head">
                    <div>
                      <h2>Month-Wise Financial Accounting Breakdown (FY {financialYear})</h2>
                      <p>Month-by-month opening balance, income, expenses, and closing balances</p>
                    </div>
                  </div>

                  <div className="portal-table-wrap">
                    <table className="portal-data-table portal-data-table-wide">
                      <thead>
                        <tr>
                          <th>MONTH</th>
                          <th>OPENING</th>
                          <th>BANK INCOME</th>
                          <th>CASH INCOME</th>
                          <th>TOTAL INCOME</th>
                          <th>BANK EXPENSE</th>
                          <th>CASH EXPENSE</th>
                          <th>TOTAL EXPENSES</th>
                          <th>NET SURPLUS</th>
                          <th>CLOSING</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((finData?.months || finData?.monthlyBreakdown || []).length === 0) ? (
                          <tr>
                            <td colSpan="10" className="portal-empty">
                              No monthly financial accounting data available for FY {financialYear}.
                            </td>
                          </tr>
                        ) : (
                          (finData?.months || finData?.monthlyBreakdown || []).map((m, idx) => {
                            const monthName = formatMonthName(m.month || m.monthNum);
                            const net = num(m.netAmount || (num(m.totalIncome) - num(m.totalExpense || m.totalExpenses)));

                            return (
                              <tr key={idx}>
                                <td><strong style={{ color: '#1473e6' }}>{monthName}</strong></td>
                                <td>{money(m.totalOpening)}</td>
                                <td style={{ color: '#079447', fontWeight: 600 }}>{money(m.bankIncome)}</td>
                                <td style={{ color: '#079447', fontWeight: 600 }}>{money(m.cashIncome)}</td>
                                <td style={{ color: '#079447', fontWeight: 700 }}>{money(m.totalIncome)}</td>
                                <td style={{ color: '#dc2626', fontWeight: 600 }}>{money(m.bankExpenses || m.bankExpense)}</td>
                                <td style={{ color: '#dc2626', fontWeight: 600 }}>{money(m.cashExpenses || m.cashExpense)}</td>
                                <td style={{ color: '#dc2626', fontWeight: 700 }}>{money(m.totalExpenses || m.totalExpense)}</td>
                                <td style={{ color: net >= 0 ? '#079447' : '#dc2626', fontWeight: 700 }}>
                                  {money(net)}
                                </td>
                                <td style={{ fontWeight: 700, color: '#1473e6' }}>{money(m.totalClosing)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {finData?.summary && (
                        <tfoot>
                          <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                            <td>TOTAL</td>
                            <td>—</td>
                            <td style={{ color: '#079447' }}>{money(finData.summary.bankIncome)}</td>
                            <td style={{ color: '#079447' }}>{money(finData.summary.cashIncome)}</td>
                            <td style={{ color: '#079447' }}>{money(finData.summary.totalIncome)}</td>
                            <td style={{ color: '#dc2626' }}>{money(finData.summary.bankExpense)}</td>
                            <td style={{ color: '#dc2626' }}>{money(finData.summary.cashExpense)}</td>
                            <td style={{ color: '#dc2626' }}>{money(finData.summary.totalExpense || finData.summary.totalExpenses)}</td>
                            <td style={{ color: (finData.summary.netSurplus || 0) >= 0 ? '#079447' : '#dc2626' }}>
                              {money(finData.summary.netSurplus)}
                            </td>
                            <td style={{ color: '#1473e6' }}>{money(finData.summary.totalClosing)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MONTHLY MAINTENANCE REPORT */}
            {activeTab === 'monthlyReport' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="portal-panel" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Filter size={16} style={{ color: '#1473e6' }} />
                    <h2 style={{ fontSize: '14px', margin: 0, color: '#1e293b' }}>Report Multi-Filters</h2>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="Search flat, wing, resident..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', paddingLeft: 30, paddingRight: 10, height: 34, fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ height: 34, fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0 10px' }}
                    >
                      <option value="ALL">All Payment Statuses</option>
                      <option value="PAID">Paid Only</option>
                      <option value="PENDING">Pending / Overdue</option>
                    </select>

                    <select
                      value={methodFilter}
                      onChange={(e) => setMethodFilter(e.target.value)}
                      style={{ height: 34, fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0 10px' }}
                    >
                      <option value="ALL">All Payment Methods</option>
                      <option value="UPI">UPI Payment</option>
                      <option value="BANK">Bank Transfer</option>
                      <option value="CASH">Cash Payment</option>
                    </select>
                  </div>
                </div>

                <div className="portal-panel portal-table-card">
                  <div className="portal-panel-head">
                    <div>
                      <h2>Monthly Maintenance Collection Table ({filteredFlatPayments.length} Records)</h2>
                      <p>Filtered payment status breakdown across society flats</p>
                    </div>
                  </div>

                  <div className="portal-table-wrap">
                    <table className="portal-data-table">
                      <thead>
                        <tr>
                          <th>Resident</th>
                          <th>Month</th>
                          <th>Maintenance</th>
                          <th style={{ color: '#dd6b20' }}>Penalty</th>
                          <th style={{ color: '#079447' }}>Discount</th>
                          <th>Total Payable</th>
                          <th style={{ color: '#079447' }}>Paid Amount</th>
                          <th style={{ color: '#dc2626' }}>Outstanding</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFlatPayments.map((r, idx) => {
                          const calc = getResidentBillAmounts(r);

                          return (
                            <tr key={idx}>
                              <td>
                                <strong>{r.resident_name || r.residentName || (r.wing ? `Wing ${r.wing} - ${r.flat_no || r.flatNo}` : '—')}</strong>
                                <small style={{ display: 'block', color: '#687588' }}>
                                  Wing {r.wing || 'A'} - {r.flat_no || r.flatNo}
                                </small>
                              </td>
                              <td>{formatMonthName(r.month)} {r.year || ''}</td>
                              <td>{moneyShort(calc.billAmt)}</td>
                              <td style={{ color: '#dd6b20', fontWeight: 600 }}>{moneyShort(calc.penaltyAmt)}</td>
                              <td style={{ color: '#079447', fontWeight: 600 }}>{moneyShort(calc.discountAmt)}</td>
                              <td><strong>{moneyShort(calc.totalPayableAmt)}</strong></td>
                              <td style={{ color: '#079447', fontWeight: 700 }}>{moneyShort(calc.displayPaid)}</td>
                              <td style={{ color: '#dc2626', fontWeight: 700 }}>{moneyShort(calc.displayPending)}</td>
                              <td>
                                <span className={`portal-status ${calc.isPaid ? 'paid' : 'pending'}`}>
                                  {calc.statusText}
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

            {/* TAB 3: EXPENSE REPORT */}
            {activeTab === 'expenses' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="portal-panel portal-table-card">
                  <div className="portal-panel-head">
                    <div>
                      <h2>Society Maintenance Expenses Report</h2>
                      <p>Detailed breakdown of all recorded operational expenses and vendor payments</p>
                    </div>
                  </div>

                  <div className="portal-table-wrap">
                    {(expensesList || []).length === 0 ? (
                      <div className="portal-empty" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                        No approved society expenses found for FY {financialYear}.
                      </div>
                    ) : (
                      <table className="portal-data-table">
                        <thead>
                          <tr>
                            <th>Expense #</th>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Vendor</th>
                            <th>Account / Mode</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expensesList.map((exp, i) => (
                            <tr key={exp.id || i}>
                              <td><strong>{exp.expense_number || (exp.id ? `EXP-${exp.id}` : '—')}</strong></td>
                              <td>{formatDate(exp.expense_date || exp.date)}</td>
                              <td>
                                <span className="portal-badge" style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                  {exp.category || 'General'}
                                </span>
                              </td>
                              <td><strong>{exp.vendor || exp.expense_title || '—'}</strong></td>
                              <td>
                                <span style={{ fontWeight: 600, color: String(exp.payment_account || exp.account_type || exp.payment_method || '').toUpperCase() === 'CASH' ? '#16a34a' : '#2563eb' }}>
                                  {exp.payment_account || exp.account_type || exp.payment_method || 'BANK'}
                                </span>
                              </td>
                              <td style={{ color: '#dc2626', fontWeight: 700 }}>
                                {money(exp.amount)}
                              </td>
                              <td>
                                <span className={`portal-status ${String(exp.status || 'paid').toLowerCase() === 'paid' ? 'paid' : 'pending'}`}>
                                  {exp.status || 'Paid'}
                                </span>
                              </td>
                              <td>{exp.description || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: BANK ACCOUNT LEDGER */}
            {activeTab === 'bankLedger' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="portal-panel portal-table-card">
                  <div className="portal-panel-head">
                    <div>
                      <h2>Verified Bank Account Transactions Ledger</h2>
                      <p>Read-only transparent audit log of verified bank transactions</p>
                    </div>
                  </div>

                  <div className="portal-table-wrap">
                    <table className="portal-data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Category / Reference</th>
                          <th>Amount</th>
                          <th>Running Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((bankLedger?.ledger || bankLedger?.transactions || bankLedger?.rows || []).map((tRow, idx) => {
                          const isIncome = num(tRow.income) > 0 || (tRow.transaction_type || tRow.type) === 'INCOME';
                          const amt = isIncome ? num(tRow.income || tRow.amount) : num(tRow.expense || tRow.amount);

                          return (
                            <tr key={idx}>
                              <td>{formatDate(tRow.date || tRow.transaction_date)}</td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background: isIncome ? '#e8f8ef' : '#f1f5f9',
                                    color: isIncome ? '#079447' : '#475467',
                                    border: isIncome ? '1px solid #bbf7d0' : '1px solid #cbd5e1'
                                  }}
                                >
                                  {isIncome ? 'INCOME' : 'EXPENSE'}
                                </span>
                              </td>
                              <td>{tRow.description || tRow.transaction_type || tRow.category}</td>
                              <td style={{ color: isIncome ? '#079447' : '#dc2626', fontWeight: 700 }}>
                                {isIncome ? '+' : '-'}{moneyShort(amt)}
                              </td>
                              <td style={{ fontWeight: 700, color: '#1473e6' }}>{moneyShort(tRow.runningBalance)}</td>
                            </tr>
                          );
                        }))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: CASH ACCOUNT LEDGER */}
            {activeTab === 'cashLedger' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="portal-panel portal-table-card">
                  <div className="portal-panel-head">
                    <div>
                      <h2>Verified Cash Account Transactions Ledger</h2>
                      <p>Read-only transparent audit log of verified cash transactions</p>
                    </div>
                  </div>

                  <div className="portal-table-wrap">
                    <table className="portal-data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Category / Reference</th>
                          <th>Amount</th>
                          <th>Running Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((cashLedger?.ledger || cashLedger?.transactions || cashLedger?.rows || []).map((tRow, idx) => {
                          const isIncome = num(tRow.income) > 0 || (tRow.transaction_type || tRow.type) === 'INCOME';
                          const amt = isIncome ? num(tRow.income || tRow.amount) : num(tRow.expense || tRow.amount);

                          return (
                            <tr key={idx}>
                              <td>{formatDate(tRow.date || tRow.transaction_date)}</td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background: isIncome ? '#e8f8ef' : '#f1f5f9',
                                    color: isIncome ? '#079447' : '#475467',
                                    border: isIncome ? '1px solid #bbf7d0' : '1px solid #cbd5e1'
                                  }}
                                >
                                  {isIncome ? 'INCOME' : 'EXPENSE'}
                                </span>
                              </td>
                              <td>{tRow.description || tRow.category}</td>
                              <td style={{ color: isIncome ? '#079447' : '#dc2626', fontWeight: 700 }}>
                                {isIncome ? '+' : '-'}{moneyShort(amt)}
                              </td>
                              <td style={{ fontWeight: 700, color: '#079447' }}>{moneyShort(tRow.runningBalance)}</td>
                            </tr>
                          );
                        }))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: MY PERSONAL ACCOUNT STATEMENT */}
            {activeTab === 'myAccount' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="portal-kpis">
                  <article className="portal-kpi">
                    <span>OPENING BALANCE</span>
                    <strong>{money(accSummary.openingBalance)}</strong>
                    <small style={{ color: '#687588' }}>FY {financialYear} Opening Dues</small>
                    <div className="portal-kpi-icon"><Landmark size={16} /></div>
                  </article>

                  <article className="portal-kpi dark" style={{ background: '#1e3a8a', color: '#ffffff' }}>
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>CLOSING OUTSTANDING DUES</span>
                    <strong style={{ color: '#ffffff' }}>{money(accSummary.closingOutstanding)}</strong>
                    <small style={{ color: 'rgba(255,255,255,0.9)', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 4 }}>
                      Resident: {residentInfo.name || 'Resident'} | Flat {residentInfo.flatNo || '—'}
                    </small>
                  </article>

                  <article className="portal-kpi">
                    <span>BILLS GENERATED</span>
                    <strong>{money(accSummary.billsGenerated)}</strong>
                    <div className="portal-kpi-icon"><CreditCard size={16} /></div>
                  </article>

                  <article className="portal-kpi green">
                    <span>APPROVED PAYMENTS</span>
                    <strong style={{ color: '#079447' }}>+{money(accSummary.approvedPayments)}</strong>
                    <small style={{ color: '#dd6b20' }}>Pending Verification: {accSummary.verificationPendingCount || 0} payments</small>
                    <div className="portal-kpi-icon"><CheckCircle2 size={16} /></div>
                  </article>
                </div>

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
                          <th style={{ color: '#079447' }}>Paid Amount</th>
                          <th style={{ color: '#dc2626' }}>Pending Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(accountData?.bills || []).map((bill, idx) => {
                          const calc = getResidentBillAmounts(bill);

                          return (
                            <tr key={idx}>
                              <td>
                                <strong>{formatMonthName(bill.month)} {bill.year}</strong>
                                <small style={{ display: 'block', color: '#687588' }}>Due: {formatDate(bill.due_date)}</small>
                              </td>
                              <td><strong>{moneyShort(calc.billAmt)}</strong></td>
                              <td style={{ color: '#dd6b20', fontWeight: 600 }}>{moneyShort(calc.penaltyAmt)}</td>
                              <td style={{ color: '#079447', fontWeight: 700 }}>{moneyShort(calc.displayPaid)}</td>
                              <td style={{ color: '#dc2626', fontWeight: 700 }}>{moneyShort(calc.displayPending)}</td>
                              <td>
                                <span className={`portal-status ${calc.isPaid ? 'paid' : 'pending'}`}>
                                  {calc.statusText}
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
          </>
        )}
      </div>
    </div>
  );
}
