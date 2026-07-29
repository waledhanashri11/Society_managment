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
  BookOpen
} from 'lucide-react';

import { maintenanceAPI, monthlyReportAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';

const money = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const moneyShort = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;
const num = (value) => Number(value || 0);

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

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'ADVANCE_PAID':
      return 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
    case 'PARTIALLY_PAID':
      return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'VERIFICATION_PENDING':
      return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'OVERDUE':
      return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    case 'WRITE_OFF':
      return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    default:
      return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
  }
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
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Society Financial & Monthly Maintenance Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive Month-Wise & Year-Wise Collection, Resident Ledger, Write-Off Audit & Verification System
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Financial Year Picker */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-xl text-sm font-semibold">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-slate-600 dark:text-slate-300">FY:</span>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white border-none outline-none cursor-pointer"
            >
              {financialYearsList.map((fy) => (
                <option key={fy} value={fy} className="text-slate-900 dark:text-slate-900">
                  {fy}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenEditOpening}
            className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 px-3.5 py-2 rounded-xl text-sm font-semibold border border-blue-200 dark:border-blue-800 transition shadow-sm"
          >
            <WalletCards className="w-4 h-4" />
            Edit Opening Balance
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={exportMonthlyReportCsv}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>

          <button
            onClick={printReport}
            className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-4 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto custom-scrollbar gap-2 pb-2 pt-1">
        {[
          { id: 'summary', label: 'Financial Accounting Summary', icon: WalletCards },
          { id: 'monthlyReport', label: 'Monthly Maintenance Report', icon: BarChart3 },
          { id: 'bankLedger', label: 'Bank Account Ledger', icon: Landmark },
          { id: 'cashLedger', label: 'Cash Account Ledger', icon: Wallet },
          { id: 'flats', label: 'Flat Collection Status', icon: Building2 },
          { id: 'writeoffs', label: 'Write-Offs & Penalties Audit', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div id="admin-report-content" className="space-y-6">
        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          <>
            {/* TAB 1: MONTHLY MAINTENANCE REPORT MODULE */}
            {activeTab === 'monthlyReport' && (
              <div className="space-y-6">
                {/* Multi-Filter Bar */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                      <Filter className="w-5 h-5 text-blue-600" />
                      Report Multi-Filters
                    </h3>
                    <button
                      onClick={() => setMonthlyFilters({ month: 'All', year: '2026', wing: 'All', floor: 'All', flat: '', resident: '', status: 'All', search: '' })}
                      className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Reset Filters
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-xs font-semibold">
                    {/* Month */}
                    <div className="space-y-1">
                      <label className="text-slate-500">Month</label>
                      <select
                        value={monthlyFilters.month}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, month: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-900 dark:text-white"
                      >
                        <option value="All">All Months</option>
                        {MONTH_NAMES.map((m, idx) => (
                          <option key={m} value={idx + 1}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* Year */}
                    <div className="space-y-1">
                      <label className="text-slate-500">Year</label>
                      <select
                        value={monthlyFilters.year}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, year: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-900 dark:text-white"
                      >
                        {['2026', '2025', '2024', '2023'].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    {/* Wing */}
                    <div className="space-y-1">
                      <label className="text-slate-500">Wing</label>
                      <select
                        value={monthlyFilters.wing}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, wing: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-900 dark:text-white"
                      >
                        <option value="All">All Wings</option>
                        {['A', 'B', 'C', 'D'].map((w) => (
                          <option key={w} value={w}>Wing {w}</option>
                        ))}
                      </select>
                    </div>

                    {/* Floor */}
                    <div className="space-y-1">
                      <label className="text-slate-500">Floor</label>
                      <select
                        value={monthlyFilters.floor}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, floor: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-900 dark:text-white"
                      >
                        <option value="All">All Floors</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((f) => (
                          <option key={f} value={f}>Floor {f}</option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Status */}
                    <div className="space-y-1">
                      <label className="text-slate-500">Status</label>
                      <select
                        value={monthlyFilters.status}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, status: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-900 dark:text-white"
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
                    </div>

                    {/* Flat No */}
                    <div className="space-y-1">
                      <label className="text-slate-500">Flat No</label>
                      <input
                        type="text"
                        placeholder="e.g. 101"
                        value={monthlyFilters.flat}
                        onChange={(e) => setMonthlyFilters({ ...monthlyFilters, flat: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Search Input */}
                    <div className="space-y-1 col-span-2">
                      <label className="text-slate-500">Search (Name / Mobile / Txn ID)</label>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={monthlyFilters.search}
                          onChange={(e) => setMonthlyFilters({ ...monthlyFilters, search: e.target.value })}
                          className="w-full pl-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Financial Collection Summary */}
                {dashboardSummary && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
                      <div className="text-xs uppercase font-bold opacity-80">Expected Collection</div>
                      <div className="text-xl font-extrabold">{moneyShort(dashboardSummary.expectedMaintenance)}</div>
                      <div className="text-[11px] opacity-80">SUM(All Payable)</div>
                    </div>

                    <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
                      <div className="text-xs uppercase font-bold opacity-80">Total Collection</div>
                      <div className="text-xl font-extrabold">{moneyShort(dashboardSummary.totalCollection)}</div>
                      <div className="text-[11px] opacity-80">Approved Payments Only</div>
                    </div>

                    <div className="bg-amber-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
                      <div className="text-xs uppercase font-bold opacity-80">Pending Collection</div>
                      <div className="text-xl font-extrabold">{moneyShort(dashboardSummary.pendingCollection)}</div>
                      <div className="text-[11px] opacity-80">Expected - Total</div>
                    </div>

                    <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
                      <div className="text-xs uppercase font-bold opacity-80">Overdue Collection</div>
                      <div className="text-xl font-extrabold">{moneyShort(dashboardSummary.overdueCollection)}</div>
                      <div className="text-[11px] opacity-80">Due Date Crossed</div>
                    </div>

                    <div className="bg-teal-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
                      <div className="text-xs uppercase font-bold opacity-80">Advance Collection</div>
                      <div className="text-xl font-extrabold">{moneyShort(dashboardSummary.advanceCollection)}</div>
                      <div className="text-[11px] opacity-80">Overpaid Balances</div>
                    </div>

                    <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
                      <div className="text-xs uppercase font-bold opacity-80">Collection %</div>
                      <div className="text-xl font-extrabold">{dashboardSummary.collectionPercentage}%</div>
                      <div className="text-[11px] opacity-80">Efficiency Ratio</div>
                    </div>
                  </div>
                )}

                {/* 12 Month History Chart / Summary Table */}
                {history12Month.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Monthly Collection History (Last 12 Months)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase">
                          <tr>
                            <th className="p-3">Month / Year</th>
                            <th className="p-3">Expected Collection</th>
                            <th className="p-3">Collected Amount</th>
                            <th className="p-3">Pending Amount</th>
                            <th className="p-3">Status Visual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {history12Month.map((h, idx) => {
                            const rate = h.expectedCollection > 0 ? (h.collectedAmount / h.expectedCollection) * 100 : 0;
                            return (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                                <td className="p-3 font-bold text-slate-900 dark:text-white">{formatMonthName(h.month)} {h.year}</td>
                                <td className="p-3 font-bold">{money(h.expectedCollection)}</td>
                                <td className="p-3 font-bold text-emerald-600">{money(h.collectedAmount)}</td>
                                <td className="p-3 font-bold text-rose-600">{money(h.pendingAmount)}</td>
                                <td className="p-3">
                                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, rate)}%` }}></div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Filtered Monthly Maintenance Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Filtered Maintenance Records ({monthlyReportData.length})
                    </h4>
                  </div>

                  {monthlyReportData.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No matching maintenance records found for selected filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase">
                          <tr>
                            <th className="p-3">Flat & Wing</th>
                            <th className="p-3">Resident</th>
                            <th className="p-3">Month</th>
                            <th className="p-3">Maintenance</th>
                            <th className="p-3">Penalty</th>
                            <th className="p-3">Discount</th>
                            <th className="p-3">Write-Off</th>
                            <th className="p-3">Total Payable</th>
                            <th className="p-3">Paid Amount</th>
                            <th className="p-3">Outstanding</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                          {monthlyReportData.map((row) => (
                            <tr key={row.bill_id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition">
                              <td className="p-3 font-bold text-slate-900 dark:text-white">
                                {row.wing ? `Wing ${row.wing} - ${row.flat_no}` : row.flat_no}
                              </td>
                              <td className="p-3 font-semibold">
                                <div>{row.resident_name || '—'}</div>
                                <div className="text-[10px] text-slate-400">{row.resident_phone || ''}</div>
                              </td>
                              <td className="p-3 font-medium">{formatMonthName(row.month)} {row.year}</td>
                              <td className="p-3">{money(row.maintenance_amount)}</td>
                              <td className="p-3 text-amber-600">{money(row.penalty)}</td>
                              <td className="p-3 text-emerald-600">{money(row.discount_amount)}</td>
                              <td className="p-3 text-purple-600">{money(row.write_off_amount)}</td>
                              <td className="p-3 font-bold text-slate-900 dark:text-white">{money(row.total_payable)}</td>
                              <td className="p-3 font-bold text-emerald-600">{money(row.paid_amount)}</td>
                              <td className="p-3 font-bold text-rose-600">{money(row.outstanding_amount)}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getStatusBadgeClass(row.calculated_status)}`}>
                                  {row.calculated_status}
                                </span>
                              </td>
                              <td className="p-3 text-center space-x-1">
                                {row.latest_payment_id && (
                                  <button
                                    onClick={() => handleOpenReceipt(row.latest_payment_id)}
                                    title="View Receipt"
                                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {row.calculated_status === 'VERIFICATION_PENDING' && row.latest_payment_id && (
                                  <>
                                    <button
                                      onClick={() => handleApprovePayment(row.latest_payment_id)}
                                      title="Approve Payment Proof"
                                      className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                                    >
                                      <FileCheck className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenRejectModal(row)}
                                      title="Reject Payment Proof"
                                      className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => handleOpenWriteOffModal(row)}
                                  title="Apply Write-Off"
                                  className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleOpenLedger(row.resident_id, row.resident_name)}
                                  title="View Resident Ledger"
                                  className="p-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                </button>
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-sm space-y-2">
                    <div className="text-xs uppercase font-bold opacity-80">Total Closing Balance</div>
                    <div className="text-2xl font-extrabold">{money(summary.totalClosing)}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="text-xs uppercase font-bold text-slate-500">Bank Closing Balance</div>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{money(summary.bankClosing)}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="text-xs uppercase font-bold text-slate-500">Cash Closing Balance</div>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{money(summary.cashClosing)}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="text-xs uppercase font-bold text-slate-500">Net Surplus / Deficit</div>
                    <div className={`text-2xl font-extrabold ${summary.netAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {money(summary.netAmount)}
                    </div>
                  </div>
                </div>

                {/* MONTH-WISE ACCOUNTING BREAKDOWN TABLE */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm space-y-3 p-5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Month-Wise Financial Accounting Breakdown (FY {financialYear})
                    </h4>
                    <button
                      onClick={handleOpenEditOpening}
                      className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100"
                    >
                      Edit Opening Balance
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase">
                        <tr>
                          <th className="p-3">Month</th>
                          <th className="p-3">Opening</th>
                          <th className="p-3">Bank Income</th>
                          <th className="p-3">Cash Income</th>
                          <th className="p-3">Total Income</th>
                          <th className="p-3">Bank Expense</th>
                          <th className="p-3">Cash Expense</th>
                          <th className="p-3">Total Expenses</th>
                          <th className="p-3">Net Surplus</th>
                          <th className="p-3">Closing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                        {((finData?.months || finData?.monthlyBreakdown || []).length === 0) ? (
                          <tr>
                            <td colSpan="10" className="p-6 text-center text-slate-500">
                              No monthly financial accounting data available for FY {financialYear}.
                            </td>
                          </tr>
                        ) : (
                          (finData?.months || finData?.monthlyBreakdown || []).map((m, idx) => {
                            const monthName = formatMonthName(m.month || m.monthNum);
                            const net = num(m.netAmount || (num(m.totalIncome) - num(m.totalExpenses)));
                            return (
                              <tr
                                key={idx}
                                onClick={() => setSelectedMonth(m)}
                                className="hover:bg-blue-50/50 dark:hover:bg-slate-750 cursor-pointer transition"
                              >
                                <td className="p-3 font-bold text-blue-600 dark:text-blue-400 underline">{monthName}</td>
                                <td className="p-3 font-medium">{money(m.totalOpening)}</td>
                                <td className="p-3 text-emerald-600">{money(m.bankIncome)}</td>
                                <td className="p-3 text-emerald-600">{money(m.cashIncome)}</td>
                                <td className="p-3 font-bold text-emerald-600">{money(m.totalIncome)}</td>
                                <td className="p-3 text-rose-600">{money(m.bankExpenses || m.bankExpense)}</td>
                                <td className="p-3 text-rose-600">{money(m.cashExpenses || m.cashExpense)}</td>
                                <td className="p-3 font-bold text-rose-600">{money(m.totalExpenses)}</td>
                                <td className={`p-3 font-bold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {money(net)}
                                </td>
                                <td className="p-3 font-extrabold text-slate-900 dark:text-white">{money(m.totalClosing)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BANK ACCOUNT LEDGER */}
            {activeTab === 'bankLedger' && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Bank Account Transaction Ledger</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {(bankLedger?.transactions || []).map((t, i) => (
                        <tr key={i}>
                          <td className="p-3">{formatDate(t.transaction_date)}</td>
                          <td className="p-3 font-bold">{t.transaction_type}</td>
                          <td className="p-3">{t.description}</td>
                          <td className={`p-3 font-bold ${t.transaction_type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {money(t.amount)}
                          </td>
                          <td className="p-3 font-bold">{money(t.runningBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: CASH ACCOUNT LEDGER */}
            {activeTab === 'cashLedger' && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Cash Account Transaction Ledger</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {(cashLedger?.transactions || []).map((t, i) => (
                        <tr key={i}>
                          <td className="p-3">{formatDate(t.transaction_date)}</td>
                          <td className="p-3 font-bold">{t.transaction_type}</td>
                          <td className="p-3">{t.description}</td>
                          <td className={`p-3 font-bold ${t.transaction_type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {money(t.amount)}
                          </td>
                          <td className="p-3 font-bold">{money(t.runningBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: FLAT COLLECTION STATUS */}
            {activeTab === 'flats' && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white">Flat Maintenance Collection Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase">
                      <tr>
                        <th className="p-3">Flat No</th>
                        <th className="p-3">Resident Name</th>
                        <th className="p-3">Month/Year</th>
                        <th className="p-3">Bill Amount</th>
                        <th className="p-3">Paid Amount</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {flatReport.map((f, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-bold">{f.flat_no}</td>
                          <td className="p-3">{f.resident_name || '—'}</td>
                          <td className="p-3">{f.month}/{f.year}</td>
                          <td className="p-3 font-bold">{money(f.total_amount || f.amount)}</td>
                          <td className="p-3 font-bold text-emerald-600">{money(f.paid_amount)}</td>
                          <td className="p-3 font-bold">{f.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: WRITE-OFFS & PENALTIES AUDIT */}
            {activeTab === 'writeoffs' && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white">Write-Off Audit Log History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Bill ID</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Approved By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {writeOffs.map((w) => (
                        <tr key={w.id}>
                          <td className="p-3">{formatDate(w.created_at)}</td>
                          <td className="p-3 font-bold">#{w.bill_id}</td>
                          <td className="p-3 font-bold text-purple-600">{w.writeoff_type}</td>
                          <td className="p-3 font-bold">{money(w.amount)}</td>
                          <td className="p-3">{w.reason}</td>
                          <td className="p-3">{w.admin_name || 'Admin'}</td>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Apply Write-Off</h3>
              <button onClick={() => setShowWriteOffModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitWriteOff} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-500">Write-Off Type</label>
                <select
                  value={writeOffForm.writeoff_type}
                  onChange={(e) => setWriteOffForm({ ...writeOffForm, writeoff_type: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                >
                  <option value="Maintenance">Maintenance Write-Off</option>
                  <option value="Penalty">Penalty Write-Off</option>
                  <option value="Full">Full Write-Off</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500">Write-Off Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={writeOffForm.amount}
                  onChange={(e) => setWriteOffForm({ ...writeOffForm, amount: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="text-slate-500">Reason</label>
                <select
                  value={writeOffForm.reason}
                  onChange={(e) => setWriteOffForm({ ...writeOffForm, reason: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                >
                  <option value="Billing Error">Billing Error</option>
                  <option value="Financial Assistance">Financial Assistance</option>
                  <option value="Society Decision">Society Decision</option>
                  <option value="Management Approval">Management Approval</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500">Remarks</label>
                <textarea
                  rows="2"
                  value={writeOffForm.remarks}
                  onChange={(e) => setWriteOffForm({ ...writeOffForm, remarks: e.target.value })}
                  placeholder="Optional audit remarks..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowWriteOffModal(false)}
                  className="bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl text-slate-700 dark:text-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWriteOff}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl font-bold"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Reject Payment Verification</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReject} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-500">Rejection Reason</label>
                <textarea
                  rows="3"
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this payment proof is rejected..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl text-slate-700 dark:text-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl font-bold"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Maintenance Payment Receipt</h3>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="payment-receipt-printable" className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-3 space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{receiptData.societyName}</h4>
                <p className="text-[10px] text-slate-500">Official Maintenance Payment Receipt</p>
                <p className="font-mono text-blue-600 font-bold">Receipt #{receiptData.receiptNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                <div><span className="text-slate-400">Resident Name:</span> <strong className="block text-slate-900 dark:text-white">{receiptData.residentName}</strong></div>
                <div><span className="text-slate-400">Flat Number:</span> <strong className="block text-slate-900 dark:text-white">{receiptData.flatNumber}</strong></div>
                <div><span className="text-slate-400">Month / Year:</span> <strong className="block text-slate-900 dark:text-white">{receiptData.maintenanceMonthYear}</strong></div>
                <div><span className="text-slate-400">Payment Date:</span> <strong className="block text-slate-900 dark:text-white">{receiptData.paymentDate}</strong></div>
                <div><span className="text-slate-400">Payment Mode:</span> <strong className="block text-slate-900 dark:text-white">{receiptData.paymentMode}</strong></div>
                <div><span className="text-slate-400">Transaction ID:</span> <strong className="block text-slate-900 dark:text-white">{receiptData.transactionId}</strong></div>
              </div>

              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl flex justify-between items-center text-emerald-800 dark:text-emerald-200 font-extrabold text-sm">
                <span>AMOUNT PAID:</span>
                <span>{money(receiptData.amountPaid)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESIDENT LEDGER MODAL */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Resident Ledger Account</h3>
                <p className="text-xs text-slate-500">Resident: {ledgerResidentName}</p>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingLedger ? (
              <div className="p-6 text-center text-xs">Loading ledger transactions...</div>
            ) : ledgerData.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No ledger transactions recorded yet.</div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase sticky top-0">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Notes</th>
                      <th className="p-3">Debit (Dr)</th>
                      <th className="p-3">Credit (Cr)</th>
                      <th className="p-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {ledgerData.map((l) => (
                      <tr key={l.id}>
                        <td className="p-3">{formatDate(l.created_at)}</td>
                        <td className="p-3 font-bold">{l.transaction_type}</td>
                        <td className="p-3 text-slate-500">{l.notes || '—'}</td>
                        <td className="p-3 font-bold text-rose-600">{l.debit > 0 ? money(l.debit) : '—'}</td>
                        <td className="p-3 font-bold text-emerald-600">{l.credit > 0 ? money(l.credit) : '—'}</td>
                        <td className="p-3 font-bold">{money(l.balance)}</td>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Set Financial Year Opening Balance
                </h3>
                <p className="text-xs text-slate-500">Financial Year: {financialYear}</p>
              </div>
              <button onClick={() => setShowEditOpeningModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOpening} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                  Bank Account Starting Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={openingForm.bankOpening}
                  onChange={(e) => setOpeningForm({ ...openingForm, bankOpening: e.target.value })}
                  placeholder="e.g. 0.00"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                  Cash Account Starting Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={openingForm.cashOpening}
                  onChange={(e) => setOpeningForm({ ...openingForm, cashOpening: e.target.value })}
                  placeholder="e.g. 0.00"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="text-xs text-slate-500">
                Saving will automatically recalculate all monthly opening, closing, and surplus/deficit balances for FY {financialYear}.
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowEditOpeningModal(false)}
                  className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOpening}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
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
