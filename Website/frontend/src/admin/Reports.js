/* eslint-disable */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Landmark,
  Printer,
  RefreshCw,
  Wallet,
  WalletCards,
  X,
  CheckCircle2,
  Clock,
  PieChart,
  BarChart3,
  TrendingUp,
  Zap,
  Droplets,
  ShieldAlert,
  FileCheck2,
  Users,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Receipt,
  FileCheck,
  Ban,
  BookOpen,
  Trash2
} from 'lucide-react';

import { maintenanceAPI, monthlyReportAPI } from '../services/api';
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
  if (!month) return '';
  if (typeof month === 'number') return MONTH_NAMES[month - 1] || String(month);
  if (typeof month === 'string' && /^\d+$/.test(month.trim())) {
    const num = parseInt(month.trim(), 10);
    return MONTH_NAMES[num - 1] || month;
  }
  return month;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
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

const getStatusBadgeClass = (status = '') => {
  const s = String(status || '').toLowerCase();
  if (s.includes('paid') && !s.includes('partially') && !s.includes('advance')) return 'portal-status paid';
  if (s.includes('advance')) return 'portal-status paid';
  if (s.includes('partially')) return 'portal-status in_progress';
  if (s.includes('overdue')) return 'portal-status overdue';
  if (s.includes('verification') || s.includes('review')) return 'portal-status pending_verification';
  if (s.includes('write')) return 'portal-status fully_written_off';
  if (s.includes('pending')) return 'portal-status pending';
  return 'portal-status open';
};

export default function AdminReports() {
  const [financialYear, setFinancialYear] = useState(getCurrentIndianFY());
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'monthlyReport' | 'bankLedger' | 'cashLedger' | 'flats' | 'writeoffs'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [finData, setFinData] = useState(null);
  const [bankLedger, setBankLedger] = useState(null);
  const [cashLedger, setCashLedger] = useState(null);
  const [flatReport, setFlatReport] = useState([]);
  const [writeOffs, setWriteOffs] = useState([]);
  const [expensesList, setExpensesList] = useState([]);

  // Monthly Maintenance Report Module States
  const [monthlyReportData, setMonthlyReportData] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [history12Month, setHistory12Month] = useState([]);
  const [paymentModeData, setPaymentModeData] = useState(null);

  // Multi-Filter State
  const [monthlyFilters, setMonthlyFilters] = useState({
    month: 'All',
    year: '2026',
    wing: 'All',
    floor: 'All',
    flat: '',
    resident: '',
    status: 'All',
    search: '',
  });

  // Modal States
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showEditOpeningModal, setShowEditOpeningModal] = useState(false);
  const [openingForm, setOpeningForm] = useState({ bankOpening: '0', cashOpening: '0' });
  const [savingOpening, setSavingOpening] = useState(false);

  // Write-Off Modal State
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [selectedBillForWriteOff, setSelectedBillForWriteOff] = useState(null);
  const [writeOffForm, setWriteOffForm] = useState({
    writeoff_type: 'Maintenance',
    amount: '',
    reason: 'Billing Error',
    remarks: '',
  });
  const [submittingWriteOff, setSubmittingWriteOff] = useState(false);

  // Payment Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPaymentForReject, setSelectedPaymentForReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Resident Ledger Modal State
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerResidentName, setLedgerResidentName] = useState('');
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Load Monthly Maintenance Module Data
  const loadMonthlyReportData = useCallback(async () => {
    try {
      const [reportRes, summaryRes, historyRes, modesRes] = await Promise.allSettled([
        monthlyReportAPI.getMonthlyReport(monthlyFilters),
        monthlyReportAPI.getDashboardSummary({ month: monthlyFilters.month, year: monthlyFilters.year }),
        monthlyReportAPI.get12MonthHistory(),
        monthlyReportAPI.getPaymentModeReport({ month: monthlyFilters.month, year: monthlyFilters.year }),
      ]);

      if (reportRes.status === 'fulfilled') setMonthlyReportData(reportRes.value.data?.data || []);
      if (summaryRes.status === 'fulfilled') setDashboardSummary(summaryRes.value.data?.data || null);
      if (historyRes.status === 'fulfilled') setHistory12Month(historyRes.value.data?.data || []);
      if (modesRes.status === 'fulfilled') setPaymentModeData(modesRes.value.data?.data || null);
    } catch (err) {
      console.error('Error loading monthly report data:', err);
    }
  }, [monthlyFilters]);

  // Load Standard Financial Reports Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await loadMonthlyReportData();

      const [finRes, bankRes, cashRes, flatRes, writeOffRes, expensesRes] = await Promise.allSettled([
        maintenanceAPI.getFinancialReport({ financialYear }),
        maintenanceAPI.getBankLedger({ financialYear }),
        maintenanceAPI.getCashLedger({ financialYear }),
        maintenanceAPI.getFlatCollectionReport({ financialYear, month: selectedMonthFilter }),
        maintenanceAPI.getWriteOffHistory({ financialYear }),
        maintenanceAPI.getExpenses({ financialYear })
      ]);

      if (finRes.status === 'fulfilled') setFinData(finRes.value.data?.data || finRes.value.data);
      if (bankRes.status === 'fulfilled') setBankLedger(bankRes.value.data?.data || bankRes.value.data);
      if (cashRes.status === 'fulfilled') setCashLedger(cashRes.value.data?.data || cashRes.value.data);
      if (flatRes.status === 'fulfilled') setFlatReport(flatRes.value.data?.data || flatRes.value.data || []);
      if (writeOffRes.status === 'fulfilled') setWriteOffs(writeOffRes.value.data?.data || writeOffRes.value.data || []);
      if (expensesRes.status === 'fulfilled') setExpensesList(expensesRes.value.data?.data || expensesRes.value.data || []);
    } catch (err) {
      console.error('Error fetching admin reports:', err);
      setError(err.response?.data?.message || 'Could not load reports from server.');
    } finally {
      setLoading(false);
    }
  }, [financialYear, selectedMonthFilter, loadMonthlyReportData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Action Handlers
  const handleApprovePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to approve this payment verification proof?')) return;
    try {
      await monthlyReportAPI.approvePayment(paymentId);
      alert('Payment approved successfully!');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve payment');
    }
  };

  const handleOpenRejectModal = (payment) => {
    setSelectedPaymentForReject(payment);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleSubmitReject = async (e) => {
    e.preventDefault();
    if (!selectedPaymentForReject) return;
    setSubmittingReject(true);
    try {
      await monthlyReportAPI.rejectPayment(selectedPaymentForReject.latest_payment_id || selectedPaymentForReject.id, {
        rejection_reason: rejectionReason,
      });
      alert('Payment verification rejected');
      setShowRejectModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject payment');
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm('Are you sure you want to delete this maintenance bill permanently? This action cannot be undone.')) return;
    try {
      await maintenanceAPI.delete(billId);
      alert('Maintenance bill deleted successfully!');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete maintenance bill');
    }
  };

  const handleCleanupOrphaned = async () => {
    if (!window.confirm('Are you sure you want to clean up all orphaned maintenance records (bills without assigned flats/residents)?')) return;
    try {
      const res = await maintenanceAPI.cleanupOrphaned();
      alert(res.data?.message || 'Orphaned maintenance records cleaned up successfully!');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clean up orphaned bills');
    }
  };

  const handleOpenWriteOffModal = (bill) => {
    setSelectedBillForWriteOff(bill);
    setWriteOffForm({
      writeoff_type: 'Maintenance',
      amount: String(bill.outstanding_amount || bill.total_payable || 0),
      reason: 'Billing Error',
      remarks: '',
    });
    setShowWriteOffModal(true);
  };

  const handleSubmitWriteOff = async (e) => {
    e.preventDefault();
    if (!selectedBillForWriteOff) return;
    setSubmittingWriteOff(true);
    try {
      await monthlyReportAPI.applyWriteOff({
        bill_id: selectedBillForWriteOff.bill_id || selectedBillForWriteOff.id,
        writeoff_type: writeOffForm.writeoff_type,
        amount: Number(writeOffForm.amount || 0),
        reason: writeOffForm.reason,
        remarks: writeOffForm.remarks,
      });
      alert('Write-off successfully applied');
      setShowWriteOffModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply write-off');
    } finally {
      setSubmittingWriteOff(false);
    }
  };

  const handleOpenReceipt = async (paymentId) => {
    if (!paymentId) return alert('Payment receipt ID unavailable');
    setLoadingReceipt(true);
    try {
      const res = await monthlyReportAPI.getPaymentReceipt(paymentId);
      setReceiptData(res.data?.data || res.data);
      setShowReceiptModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch receipt');
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleOpenLedger = async (residentId, residentName) => {
    if (!residentId) return alert('Resident ID unavailable');
    setLoadingLedger(true);
    setLedgerResidentName(residentName);
    try {
      const res = await monthlyReportAPI.getResidentLedger({ resident_id: residentId });
      setLedgerData(res.data?.data || []);
      setShowLedgerModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch resident ledger');
    } finally {
      setLoadingLedger(false);
    }
  };

  // CSV Export Utility
  const exportToCsv = (filename, rows) => {
    if (!rows || !rows.length) return alert('No data to export');
    const headers = Object.keys(rows[0]).join(',');
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows.map((e) => Object.values(e).map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMonthlyReportCsv = () => {
    const formatted = monthlyReportData.map((r) => ({
      Wing: r.wing,
      Flat_No: r.flat_no,
      Resident_Name: r.resident_name,
      Month: r.month,
      Year: r.year,
      Maintenance_Amount: r.maintenance_amount,
      Penalty: r.penalty,
      Discount: r.discount_amount,
      Write_Off: r.write_off_amount,
      Total_Payable: r.total_payable,
      Amount_Paid: r.paid_amount,
      Outstanding: r.outstanding_amount,
      Status: r.calculated_status,
      Transaction_ID: r.transaction_id || 'N/A',
      Receipt_Number: r.receipt_number || 'N/A',
    }));
    exportToCsv(`Monthly_Maintenance_Report_${monthlyFilters.year}_Month_${monthlyFilters.month}.csv`, formatted);
  };

  const printReport = () => {
    window.print();
  };

  const handleOpenEditOpening = () => {
    const sum = finData?.summary || {};
    setOpeningForm({
      bankOpening: String(sum?.bankOpening || 0),
      cashOpening: String(sum?.cashOpening || 0)
    });
    setShowEditOpeningModal(true);
  };

  const handleSaveOpening = async (e) => {
    e.preventDefault();
    setSavingOpening(true);
    try {
      await maintenanceAPI.saveOpeningBalance({
        financialYear,
        bankOpening: Number(openingForm.bankOpening || 0),
        cashOpening: Number(openingForm.cashOpening || 0)
      });
      setShowEditOpeningModal(false);
      await loadData();
    } catch (err) {
      alert('Failed to save opening balance');
    } finally {
      setSavingOpening(false);
    }
  };

  // Overall Financial Summary
  const summary = finData?.summary || {};

  return (
    <div className="portal-module" style={{ width: '100%' }}>
      {/* Top Action Bar */}
      <div className="portal-page-title">
        <div>
          <h1>Society Financial & Maintenance Reports</h1>
          <p>
            Comprehensive Month-Wise & Year-Wise Collection, Resident Ledger & Verification System
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
          {/* Financial Year Picker */}
          <div className="portal-date-chip" style={{ padding: '6px 8px' }}>
            <Calendar size={13} />
            <span>FY:</span>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              style={{ border: 0, outline: 'none', background: 'transparent', fontWeight: 700, cursor: 'pointer', fontSize: '11px' }}
            >
              {financialYearsList.map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>
          </div>

          <button onClick={handleOpenEditOpening} className="portal-light-btn" style={{ padding: '7px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}>
            <WalletCards size={14} /> Edit Opening Balance
          </button>

          <button onClick={loadData} className="portal-light-btn" style={{ padding: '7px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>

          <button onClick={exportMonthlyReportCsv} className="portal-light-btn" style={{ color: '#079447', padding: '7px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}>
            <FileSpreadsheet size={14} /> Export Excel
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

      {/* Navigation Tabs (Pill style matching Notices page) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'summary', label: 'Financial Accounting Summary', icon: WalletCards },
          { id: 'monthlyReport', label: 'Monthly Maintenance Report', icon: BarChart3 },
          { id: 'bankLedger', label: 'Bank Account Ledger', icon: Landmark },
          { id: 'cashLedger', label: 'Cash Account Ledger', icon: Wallet },
          { id: 'flats', label: 'Flat Collection Status', icon: Building2 }
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

      <div id="admin-report-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {loading ? (
          CardSkeleton && (typeof CardSkeleton === 'function' || typeof CardSkeleton === 'object') ? (
            <CardSkeleton count={4} />
          ) : (
            <div className="portal-panel" style={{ padding: '20px', textAlign: 'center' }}>Loading reports...</div>
          )
        ) : (
          <>
            {/* TAB 1: MONTHLY MAINTENANCE REPORT MODULE */}
            {activeTab === 'monthlyReport' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Multi-Filter Bar */}
                <div className="portal-panel">
                  <div className="portal-panel-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Filter size={16} style={{ color: '#1473e6' }} />
                      <h2>Report Multi-Filters</h2>
                    </div>
                    <button
                      onClick={() => setMonthlyFilters({ month: 'All', year: '2026', wing: 'All', floor: 'All', flat: '', resident: '', status: 'All', search: '' })}
                      className="portal-link-button"
                    >
                      Reset Filters
                    </button>
                  </div>

                  <div className="portal-form-grid" style={{ gridTemplateColumns: 'minmax(100px, 1fr) minmax(85px, 0.8fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(150px, 1.3fr) minmax(95px, 1fr) minmax(180px, 2fr)', gap: '10px', padding: '14px 16px' }}>
                    {/* Month */}
                    <label>
                      Month
                      <select
                        value={monthlyFilters.month}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, month: e.target.value })}
                      >
                        <option value="All">All Months</option>
                        {MONTH_NAMES.map((m, idx) => (
                          <option key={m} value={idx + 1}>{m}</option>
                        ))}
                      </select>
                    </label>

                    {/* Year */}
                    <label>
                      Year
                      <select
                        value={monthlyFilters.year}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, year: e.target.value })}
                      >
                        {['2026', '2025', '2024', '2023'].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </label>

                    {/* Wing */}
                    <label>
                      Wing
                      <select
                        value={monthlyFilters.wing}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, wing: e.target.value })}
                      >
                        <option value="All">All Wings</option>
                        {['A', 'B', 'C', 'D'].map((w) => (
                          <option key={w} value={w}>Wing {w}</option>
                        ))}
                      </select>
                    </label>

                    {/* Floor */}
                    <label>
                      Floor
                      <select
                        value={monthlyFilters.floor}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, floor: e.target.value })}
                      >
                        <option value="All">All Floors</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((f) => (
                          <option key={f} value={f}>Floor {f}</option>
                        ))}
                      </select>
                    </label>

                    {/* Payment Status */}
                    <label>
                      Status
                      <select
                        value={monthlyFilters.status}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, status: e.target.value })}
                      >
                        <option value="All">All Statuses</option>
                        <option value="PAID">PAID</option>
                        <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                        <option value="PENDING">PENDING</option>
                        <option value="OVERDUE">OVERDUE</option>
                        <option value="VERIFICATION_PENDING">VERIFICATION_PENDING</option>
                        <option value="WRITE_OFF">WRITE_OFF</option>
                        <option value="ADVANCE_PAID">ADVANCE_PAID</option>
                      </select>
                    </label>

                    {/* Flat No */}
                    <label>
                      Flat No
                      <input
                        type="text"
                        placeholder="e.g. 101"
                        value={monthlyFilters.flat}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, flat: e.target.value })}
                      />
                    </label>

                    {/* Search Input */}
                    <label>
                      Search (Name / Mobile / Txn ID)
                      <input
                        type="text"
                        placeholder="Search..."
                        value={monthlyFilters.search}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, search: e.target.value })}
                      />
                    </label>
                  </div>
                </div>

                {/* KPI Financial Collection Summary */}
                {dashboardSummary && (
                  <div className="portal-kpis notice-kpis" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px' }}>
                    <article className="portal-kpi" style={{ padding: '12px 10px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, paddingRight: '22px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>EXPECTED COLLECTION</span>
                      <strong>{moneyShort(dashboardSummary.expectedMaintenance)}</strong>
                      <small style={{ color: '#687588' }}>SUM(All Payable)</small>
                      <div className="portal-kpi-icon" style={{ width: 26, height: 26, top: 10, right: 8 }}><IndianRupee size={14} /></div>
                    </article>

                    <article className="portal-kpi green" style={{ padding: '12px 10px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, paddingRight: '22px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>TOTAL COLLECTION</span>
                      <strong>{moneyShort(dashboardSummary.totalCollection)}</strong>
                      <small>Approved Payments Only</small>
                      <div className="portal-kpi-icon" style={{ width: 26, height: 26, top: 10, right: 8 }}><CheckCircle2 size={14} /></div>
                    </article>

                    <article className="portal-kpi orange" style={{ padding: '12px 10px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, paddingRight: '22px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>PENDING COLLECTION</span>
                      <strong>{moneyShort(dashboardSummary.pendingCollection)}</strong>
                      <small style={{ color: '#dd6b20' }}>Expected - Total</small>
                      <div className="portal-kpi-icon" style={{ width: 26, height: 26, top: 10, right: 8 }}><Clock size={14} /></div>
                    </article>

                    <article className="portal-kpi red" style={{ padding: '12px 10px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, paddingRight: '22px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>OVERDUE COLLECTION</span>
                      <strong>{moneyShort(dashboardSummary.overdueCollection)}</strong>
                      <small style={{ color: '#e33d33' }}>Due Date Crossed</small>
                      <div className="portal-kpi-icon" style={{ width: 26, height: 26, top: 10, right: 8 }}><AlertTriangle size={14} /></div>
                    </article>

                    <article className="portal-kpi green" style={{ padding: '12px 10px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, paddingRight: '22px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>ADVANCE COLLECTION</span>
                      <strong>{moneyShort(dashboardSummary.advanceCollection)}</strong>
                      <small>Overpaid Balances</small>
                      <div className="portal-kpi-icon" style={{ width: 26, height: 26, top: 10, right: 8 }}><Wallet size={14} /></div>
                    </article>

                    <article className="portal-kpi" style={{ padding: '12px 10px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, paddingRight: '22px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>COLLECTION %</span>
                      <strong>{dashboardSummary.collectionPercentage}%</strong>
                      <small style={{ color: '#1473e6' }}>Efficiency Ratio</small>
                      <div className="portal-kpi-icon" style={{ width: 26, height: 26, top: 10, right: 8 }}><TrendingUp size={14} /></div>
                    </article>
                  </div>
                )}

                {/* 12 Month History Table */}
                <div className="portal-panel portal-table-card">
                  <div className="portal-panel-head">
                    <div>
                      <h2>Monthly Collection History (Last 12 Months)</h2>
                      <p>12-month expected vs collected maintenance history</p>
                    </div>
                  </div>
                  <div className="portal-table-wrap">
                    <table className="portal-data-table">
                      <thead>
                        <tr>
                          <th>Month / Year</th>
                          <th>Expected Collection</th>
                          <th>Collected Amount</th>
                          <th>Pending Amount</th>
                          <th>Status Visual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history12Month.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="portal-empty">
                              No 12-month collection history recorded yet.
                            </td>
                          </tr>
                        ) : (
                          history12Month.map((h, idx) => {
                            const rate = h.expectedCollection > 0 ? (h.collectedAmount / h.expectedCollection) * 100 : 0;
                            return (
                              <tr key={idx}>
                                <td><strong>{formatMonthName(h.month)} {h.year}</strong></td>
                                <td><strong>{money(h.expectedCollection)}</strong></td>
                                <td style={{ color: '#079447', fontWeight: 700 }}>{money(h.collectedAmount)}</td>
                                <td style={{ color: '#dc2626', fontWeight: 700 }}>{money(h.pendingAmount)}</td>
                                <td>
                                  <div style={{ width: '100%', background: '#e5eaf0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                                    <div style={{ background: '#079447', height: 8, borderRadius: 99, width: `${Math.min(100, rate)}%` }}></div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Filtered Monthly Maintenance Table */}
                <div className="portal-panel portal-table-card">
                  <div className="portal-panel-head">
                    <div>
                      <h2>Filtered Maintenance Records ({monthlyReportData.length})</h2>
                      <p>Detailed flat maintenance billing, collections, and write-off status</p>
                    </div>
                  </div>

                  {monthlyReportData.length === 0 ? (
                    <div className="portal-empty">
                      No matching maintenance records found for selected filters.
                    </div>
                  ) : (
                    <div className="portal-table-wrap">
                      <table className="portal-data-table">
                        <thead>
                          <tr>
                            <th>Resident</th>
                            <th>Month</th>
                            <th>Maintenance</th>
                            <th>Penalty</th>
                            <th>Discount</th>
                            <th>Write-Off</th>
                            <th>Total Payable</th>
                            <th>Paid Amount</th>
                            <th>Outstanding</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyReportData.map((row) => (
                            <tr key={row.bill_id}>
                              <td>
                                <strong>{row.resident_name || (row.wing ? `Wing ${row.wing} - ${row.flat_no}` : (row.flat_no || '—'))}</strong>
                                <small style={{ display: 'block', color: '#687588' }}>
                                  {row.wing ? `Wing ${row.wing} - ${row.flat_no}` : (row.resident_phone || '')}
                                </small>
                              </td>
                              <td>{formatMonthName(row.month)} {row.year}</td>
                              <td>{money(row.maintenance_amount)}</td>
                              <td style={{ color: '#dd6b20' }}>{money(row.penalty)}</td>
                              <td style={{ color: '#079447' }}>{money(row.discount_amount)}</td>
                              <td style={{ color: '#7a5af8' }}>{money(row.write_off_amount)}</td>
                              <td><strong>{money(row.total_payable)}</strong></td>
                              <td style={{ color: '#079447', fontWeight: 700 }}>{money(row.paid_amount)}</td>
                              <td style={{ color: '#dc2626', fontWeight: 700 }}>{money(row.outstanding_amount)}</td>
                              <td>
                                <span className={getStatusBadgeClass(row.calculated_status)}>
                                  {row.calculated_status}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <button
                                    onClick={() => handleOpenReceipt(row.latest_payment_id || row.bill_id)}
                                    className="portal-icon-btn"
                                    title="View Receipt / Details"
                                    style={{ width: 26, height: 26, borderRadius: 6, background: '#eaf3ff', border: '1px solid #c7d7ea', color: '#1473e6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                  >
                                    <Receipt size={13} />
                                  </button>

                                  {row.latest_payment_id && (
                                    <button
                                      onClick={() => handleApprovePayment(row.latest_payment_id)}
                                      className="portal-icon-btn"
                                      title="Approve Payment"
                                      style={{ width: 26, height: 26, borderRadius: 6, background: '#e6f4ea', border: '1px solid #b7e1cd', color: '#079447', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                      <CheckCircle2 size={13} />
                                    </button>
                                  )}

                                  {row.latest_payment_id && (
                                    <button
                                      onClick={() => handleOpenRejectModal(row)}
                                      className="portal-icon-btn"
                                      title="Reject Payment"
                                      style={{ width: 26, height: 26, borderRadius: 6, background: '#fce8e6', border: '1px solid #f5c2c0', color: '#dc2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                      <XCircle size={13} />
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleOpenWriteOffModal(row)}
                                    className="portal-icon-btn"
                                    title="Write-Off Bill"
                                    style={{ width: 26, height: 26, borderRadius: 6, background: '#f3e8ff', border: '1px solid #e9d5ff', color: '#7a5af8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                  >
                                    <FileText size={13} />
                                  </button>

                                  {row.resident_id && (
                                    <button
                                      onClick={() => handleOpenLedger(row.resident_id, row.resident_name)}
                                      className="portal-icon-btn"
                                      title="Resident Ledger"
                                      style={{ width: 26, height: 26, borderRadius: 6, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475467', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                      <BookOpen size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FINANCIAL ACCOUNTING SUMMARY */}
            {activeTab === 'summary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="portal-kpis">
                  <article className="portal-kpi">
                    <span>TOTAL CLOSING BALANCE</span>
                    <strong>{money(summary.totalClosing)}</strong>
                    <small style={{ color: '#687588' }}>Total Financial Closing</small>
                    <div className="portal-kpi-icon"><WalletCards size={17} /></div>
                  </article>

                  <article className="portal-kpi">
                    <span>BANK CLOSING BALANCE</span>
                    <strong>{money(summary.bankClosing)}</strong>
                    <small style={{ color: '#687588' }}>Bank Account Balance</small>
                    <div className="portal-kpi-icon"><Landmark size={17} /></div>
                  </article>

                  <article className="portal-kpi green">
                    <span>CASH CLOSING BALANCE</span>
                    <strong>{money(summary.cashClosing)}</strong>
                    <small>Cash Account Balance</small>
                    <div className="portal-kpi-icon"><Wallet size={17} /></div>
                  </article>

                  <article className={`portal-kpi ${summary.netAmount >= 0 ? 'green' : 'red'}`}>
                    <span>NET SURPLUS / DEFICIT</span>
                    <strong style={{ color: summary.netAmount >= 0 ? '#079447' : '#dc2626' }}>
                      {money(summary.netAmount)}
                    </strong>
                    <small>{summary.netAmount >= 0 ? 'Net Surplus' : 'Net Deficit'}</small>
                    <div className="portal-kpi-icon"><TrendingUp size={17} /></div>
                  </article>
                </div>

                {/* MONTH-WISE ACCOUNTING BREAKDOWN TABLE */}
                <div className="portal-panel portal-table-card">
                  <div className="portal-panel-head">
                    <div>
                      <h2>Month-Wise Financial Accounting Breakdown (FY {financialYear})</h2>
                      <p>Month-by-month opening balance, income, expenses, and closing balances</p>
                    </div>
                    <button onClick={handleOpenEditOpening} className="portal-light-btn">
                      <WalletCards size={15} /> Edit Opening Balance
                    </button>
                  </div>

                  <div className="portal-table-wrap">
                    <table className="portal-data-table">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Opening</th>
                          <th>Bank Income</th>
                          <th>Cash Income</th>
                          <th>Total Income</th>
                          <th>Bank Expense</th>
                          <th>Cash Expense</th>
                          <th>Total Expenses</th>
                          <th>Maintenance Write-Off</th>
                          <th>Penalty Write-Off</th>
                          <th>Total Write-Off</th>
                          <th>Net Surplus</th>
                          <th>Closing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((finData?.months || finData?.monthlyBreakdown || []).length === 0) ? (
                          <tr>
                            <td colSpan="13" className="portal-empty">
                              No monthly financial accounting data available for FY {financialYear}.
                            </td>
                          </tr>
                        ) : (
                          (finData?.months || finData?.monthlyBreakdown || []).map((m, idx) => {
                            const monthName = formatMonthName(m.month || m.monthNum);
                            const net = num(m.netAmount || (num(m.totalIncome) - num(m.totalExpense || m.totalExpenses)));
                            const maintWO = num(m.maintenanceWriteOff);
                            const penaltyWO = num(m.penaltyWriteOff);
                            const totalWO = num(m.totalWriteOff !== undefined ? m.totalWriteOff : (maintWO + penaltyWO));

                            return (
                              <tr
                                key={idx}
                                onClick={() => setSelectedMonth(m)}
                                style={{ cursor: 'pointer' }}
                              >
                                <td><strong style={{ color: '#1473e6' }}>{monthName}</strong></td>
                                <td>{money(m.totalOpening)}</td>
                                <td style={{ color: '#079447', fontWeight: 600 }}>{money(m.bankIncome)}</td>
                                <td style={{ color: '#079447', fontWeight: 600 }}>{money(m.cashIncome)}</td>
                                <td style={{ color: '#079447', fontWeight: 700 }}>{money(m.totalIncome)}</td>
                                <td style={{ color: '#dc2626', fontWeight: 600 }}>{money(m.bankExpenses || m.bankExpense)}</td>
                                <td style={{ color: '#dc2626', fontWeight: 600 }}>{money(m.cashExpenses || m.cashExpense)}</td>
                                <td style={{ color: '#dc2626', fontWeight: 700 }}>{money(m.totalExpenses || m.totalExpense)}</td>
                                <td style={{ color: maintWO > 0 ? '#079447' : 'inherit', fontWeight: maintWO > 0 ? 600 : 'normal' }}>
                                  {money(maintWO)}
                                </td>
                                <td style={{ color: penaltyWO > 0 ? '#079447' : 'inherit', fontWeight: penaltyWO > 0 ? 600 : 'normal' }}>
                                  {money(penaltyWO)}
                                </td>
                                <td style={{ color: totalWO > 0 ? '#079447' : 'inherit', fontWeight: totalWO > 0 ? 700 : 'normal' }}>
                                  {money(totalWO)}
                                </td>
                                <td style={{ color: net >= 0 ? '#079447' : '#dc2626', fontWeight: 700 }}>
                                  {money(net)}
                                </td>
                                <td><strong>{money(m.totalClosing)}</strong></td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {finData?.summary && (
                        <tfoot>
                          <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                            <td style={{ color: '#1e293b' }}>TOTAL</td>
                            <td>—</td>
                            <td style={{ color: '#079447' }}>{money(summary.bankIncome)}</td>
                            <td style={{ color: '#079447' }}>{money(summary.cashIncome)}</td>
                            <td style={{ color: '#079447' }}>{money(summary.totalIncome)}</td>
                            <td style={{ color: '#dc2626' }}>{money(summary.bankExpense)}</td>
                            <td style={{ color: '#dc2626' }}>{money(summary.cashExpense)}</td>
                            <td style={{ color: '#dc2626' }}>{money(summary.totalExpense)}</td>
                            <td style={{ color: num(summary.maintenanceWriteOff) > 0 ? '#079447' : 'inherit' }}>
                              {money(summary.maintenanceWriteOff)}
                            </td>
                            <td style={{ color: num(summary.penaltyWriteOff) > 0 ? '#079447' : 'inherit' }}>
                              {money(summary.penaltyWriteOff)}
                            </td>
                            <td style={{ color: num(summary.totalWriteOff) > 0 ? '#079447' : 'inherit' }}>
                              {money(summary.totalWriteOff)}
                            </td>
                            <td style={{ color: (num(summary.totalIncome) - num(summary.totalExpense)) >= 0 ? '#079447' : '#dc2626' }}>
                              {money(num(summary.totalIncome) - num(summary.totalExpense))}
                            </td>
                            <td><strong>{money(summary.totalClosing)}</strong></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BANK ACCOUNT LEDGER */}
            {activeTab === 'bankLedger' && (
              <div className="portal-panel portal-table-card">
                <div className="portal-panel-head">
                  <div>
                    <h2>Bank Account Transaction Ledger</h2>
                    <p>All recorded bank income and expenditure transactions</p>
                  </div>
                </div>
                <div className="portal-table-wrap">
                  <table className="portal-data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bankLedger?.transactions || []).map((t, i) => (
                        <tr key={i}>
                          <td>{formatDate(t.transaction_date)}</td>
                          <td><strong>{t.transaction_type}</strong></td>
                          <td>{t.description}</td>
                          <td style={{ color: t.transaction_type === 'INCOME' ? '#079447' : '#dc2626', fontWeight: 700 }}>
                            {money(t.amount)}
                          </td>
                          <td><strong>{money(t.runningBalance)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: CASH ACCOUNT LEDGER */}
            {activeTab === 'cashLedger' && (
              <div className="portal-panel portal-table-card">
                <div className="portal-panel-head">
                  <div>
                    <h2>Cash Account Transaction Ledger</h2>
                    <p>All recorded cash income and expense transactions</p>
                  </div>
                </div>
                <div className="portal-table-wrap">
                  <table className="portal-data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(cashLedger?.transactions || []).map((t, i) => (
                        <tr key={i}>
                          <td>{formatDate(t.transaction_date)}</td>
                          <td><strong>{t.transaction_type}</strong></td>
                          <td>{t.description}</td>
                          <td style={{ color: t.transaction_type === 'INCOME' ? '#079447' : '#dc2626', fontWeight: 700 }}>
                            {money(t.amount)}
                          </td>
                          <td><strong>{money(t.runningBalance)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: FLAT COLLECTION STATUS */}
            {activeTab === 'flats' && (
              <div className="portal-panel portal-table-card">
                <div className="portal-panel-head">
                  <div>
                    <h2>Flat Maintenance Collection Summary</h2>
                    <p>Flat-wise billing and payment status summary</p>
                  </div>
                </div>
                <div className="portal-table-wrap">
                  <table className="portal-data-table">
                    <thead>
                      <tr>
                        <th>Flat No</th>
                        <th>Resident Name</th>
                        <th>Month/Year</th>
                        <th>Bill Amount</th>
                        <th>Paid Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flatReport.map((f, idx) => (
                        <tr key={idx}>
                          <td><strong>{f.flat_no}</strong></td>
                          <td>{f.resident_name || '—'}</td>
                          <td>{f.month}/{f.year}</td>
                          <td><strong>{money(f.total_amount || f.amount)}</strong></td>
                          <td style={{ color: '#079447', fontWeight: 700 }}>{money(f.paid_amount)}</td>
                          <td><span className={getStatusBadgeClass(f.status)}>{f.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* WRITE-OFF MODAL */}
      {showWriteOffModal && selectedBillForWriteOff && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowWriteOffModal(false)}>
          <div className="portal-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Apply Write-Off</h3>
                <p>Flat #{selectedBillForWriteOff.flat_no} - Bill #{selectedBillForWriteOff.bill_id}</p>
              </div>
              <button type="button" onClick={() => setShowWriteOffModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmitWriteOff} className="portal-form">
              <label>
                Write-Off Type
                <select
                  value={writeOffForm.writeoff_type}
                  onChange={(e) => setWriteOffForm({ ...writeOffForm, writeoff_type: e.target.value })}
                >
                  <option value="Maintenance">Maintenance Write-Off</option>
                  <option value="Penalty">Penalty Write-Off</option>
                  <option value="Full">Full Write-Off</option>
                </select>
              </label>

              <label>
                Write-Off Amount (₹)
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={writeOffForm.amount}
                  onChange={(e) => setWriteOffForm({ ...writeOffForm, amount: e.target.value })}
                />
              </label>

              <label className="portal-field-full">
                Reason
                <select
                  value={writeOffForm.reason}
                  onChange={(e) => setWriteOffForm({ ...writeOffForm, reason: e.target.value })}
                >
                  <option value="Billing Error">Billing Error</option>
                  <option value="Financial Assistance">Financial Assistance</option>
                  <option value="Society Decision">Society Decision</option>
                  <option value="Management Approval">Management Approval</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="portal-field-full">
                Remarks
                <textarea
                  rows="2"
                  value={writeOffForm.remarks}
                  onChange={(e) => setWriteOffForm({ ...writeOffForm, remarks: e.target.value })}
                  placeholder="Optional audit remarks..."
                />
              </label>

              <div className="portal-form-actions">
                <button
                  type="button"
                  onClick={() => setShowWriteOffModal(false)}
                  className="portal-light-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWriteOff}
                  className="portal-primary-btn"
                >
                  {submittingWriteOff ? 'Applying...' : 'Apply Write-Off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT PAYMENT MODAL */}
      {showRejectModal && selectedPaymentForReject && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowRejectModal(false)}>
          <div className="portal-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Reject Payment Verification</h3>
                <p>Payment #{selectedPaymentForReject.latest_payment_id}</p>
              </div>
              <button type="button" onClick={() => setShowRejectModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmitReject} className="portal-form">
              <label className="portal-field-full">
                Rejection Reason
                <textarea
                  rows="3"
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide detailed reason for rejecting this payment proof..."
                />
              </label>

              <div className="portal-form-actions">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="portal-light-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="portal-primary-btn"
                  style={{ background: '#dc2626' }}
                >
                  {submittingReject ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceiptModal && receiptData && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowReceiptModal(false)}>
          <div className="portal-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Maintenance Payment Receipt</h3>
                <p>Receipt #{receiptData.receiptNumber}</p>
              </div>
              <button type="button" onClick={() => setShowReceiptModal(false)}>×</button>
            </div>

            <div id="payment-receipt-printable" style={{ padding: '20px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid #e5eaf0', paddingBottom: '12px', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>{receiptData.societyName}</h4>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#687588' }}>Official Maintenance Payment Receipt</p>
                <p style={{ margin: '4px 0 0', fontFamily: 'monospace', color: '#1473e6', fontWeight: 700 }}>Receipt #{receiptData.receiptNumber}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', marginBottom: '14px' }}>
                <div><span style={{ color: '#687588' }}>Resident Name:</span> <strong style={{ display: 'block' }}>{receiptData.residentName}</strong></div>
                <div><span style={{ color: '#687588' }}>Flat Number:</span> <strong style={{ display: 'block' }}>{receiptData.flatNumber}</strong></div>
                <div><span style={{ color: '#687588' }}>Month / Year:</span> <strong style={{ display: 'block' }}>{receiptData.maintenanceMonthYear}</strong></div>
                <div><span style={{ color: '#687588' }}>Payment Date:</span> <strong style={{ display: 'block' }}>{receiptData.paymentDate}</strong></div>
                <div><span style={{ color: '#687588' }}>Payment Mode:</span> <strong style={{ display: 'block' }}>{receiptData.paymentMode}</strong></div>
                <div><span style={{ color: '#687588' }}>Transaction ID:</span> <strong style={{ display: 'block' }}>{receiptData.transactionId}</strong></div>
              </div>

              <div style={{ padding: '12px 16px', background: '#e8f8ef', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#05783b', fontWeight: 800, fontSize: '14px' }}>
                <span>AMOUNT PAID:</span>
                <span>{money(receiptData.amountPaid)}</span>
              </div>
            </div>

            <div className="portal-form-actions" style={{ padding: '0 20px 20px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="portal-primary-btn"
              >
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESIDENT LEDGER MODAL */}
      {showLedgerModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowLedgerModal(false)}>
          <div className="portal-modal" style={{ maxWidth: '640px' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Resident Ledger Account</h3>
                <p>Resident: {ledgerResidentName}</p>
              </div>
              <button type="button" onClick={() => setShowLedgerModal(false)}>×</button>
            </div>

            {loadingLedger ? (
              <div className="portal-empty">Loading ledger transactions...</div>
            ) : ledgerData.length === 0 ? (
              <div className="portal-empty">No ledger transactions recorded yet.</div>
            ) : (
              <div className="portal-table-wrap" style={{ maxHeight: '380px' }}>
                <table className="portal-data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Notes</th>
                      <th>Debit (Dr)</th>
                      <th>Credit (Cr)</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.map((l) => (
                      <tr key={l.id}>
                        <td>{formatDate(l.created_at)}</td>
                        <td><strong>{l.transaction_type}</strong></td>
                        <td style={{ color: '#687588' }}>{l.notes || '—'}</td>
                        <td style={{ color: '#dc2626', fontWeight: 700 }}>{l.debit > 0 ? money(l.debit) : '—'}</td>
                        <td style={{ color: '#079447', fontWeight: 700 }}>{l.credit > 0 ? money(l.credit) : '—'}</td>
                        <td><strong>{money(l.balance)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT OPENING BALANCE MODAL */}
      {showEditOpeningModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowEditOpeningModal(false)}>
          <div className="portal-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Set Financial Year Opening Balance</h3>
                <p>Financial Year: {financialYear}</p>
              </div>
              <button type="button" onClick={() => setShowEditOpeningModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveOpening} className="portal-form">
              <label className="portal-field-full">
                Bank Account Starting Opening Balance (₹)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={openingForm.bankOpening}
                  onChange={(e) => setOpeningForm({ ...openingForm, bankOpening: e.target.value })}
                  placeholder="e.g. 0.00"
                />
              </label>

              <label className="portal-field-full">
                Cash Account Starting Opening Balance (₹)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={openingForm.cashOpening}
                  onChange={(e) => setOpeningForm({ ...openingForm, cashOpening: e.target.value })}
                  placeholder="e.g. 0.00"
                />
              </label>

              <p className="portal-muted portal-field-full">
                Saving will automatically recalculate all monthly opening, closing, and surplus/deficit balances for FY {financialYear}.
              </p>

              <div className="portal-form-actions">
                <button
                  type="button"
                  onClick={() => setShowEditOpeningModal(false)}
                  className="portal-light-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOpening}
                  className="portal-primary-btn"
                >
                  {savingOpening ? 'Saving...' : 'Save Opening Balances'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
