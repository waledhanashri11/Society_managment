import React, { useCallback, useEffect, useState } from 'react';
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
  X
} from 'lucide-react';

import { maintenanceAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';

const money = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const moneyShort = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

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

export default function AdminReports() {
  const [financialYear, setFinancialYear] = useState(getCurrentIndianFY());
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'bankLedger' | 'cashLedger' | 'flats' | 'writeoffs'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [finData, setFinData] = useState(null);
  const [bankLedger, setBankLedger] = useState(null);
  const [cashLedger, setCashLedger] = useState(null);
  const [flatReport, setFlatReport] = useState([]);
  const [writeOffs, setWriteOffs] = useState([]);

  // Flat Report filters
  const [flatFilters, setFlatFilters] = useState({
    month: 'All',
    wing: 'All',
    flatNo: '',
    status: 'All'
  });

  // Month Detail Modal
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Edit Opening Balance Modal State
  const [showEditOpeningModal, setShowEditOpeningModal] = useState(false);
  const [openingForm, setOpeningForm] = useState({ bankOpening: '0', cashOpening: '0' });
  const [savingOpening, setSavingOpening] = useState(false);

  const handleOpenEditOpening = () => {
    setOpeningForm({
      bankOpening: String(finData?.summary?.bankOpening || 0),
      cashOpening: String(finData?.summary?.cashOpening || 0)
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [finRes, bankRes, cashRes, flatRes, writeOffRes] = await Promise.all([
        maintenanceAPI.getFinancialReport({ financialYear }),
        maintenanceAPI.getBankLedger({ financialYear }),
        maintenanceAPI.getCashLedger({ financialYear }),
        maintenanceAPI.getFlatCollectionReport({ financialYear, ...flatFilters }),
        maintenanceAPI.getWriteOffHistory({ financialYear })
      ]);

      setFinData(finRes.data?.data || finRes.data);
      setBankLedger(bankRes.data?.data || bankRes.data);
      setCashLedger(cashRes.data?.data || cashRes.data);
      setFlatReport(flatRes.data?.data || flatRes.data || []);
      setWriteOffs(writeOffRes.data?.data || writeOffRes.data || []);
    } catch (err) {
      console.error('Error fetching admin reports:', err);
      setError(err.response?.data?.message || 'Could not load reports from server.');
    } finally {
      setLoading(false);
    }
  }, [financialYear, flatFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // CSV Export Handler
  const exportToCsv = (filename, rows) => {
    if (!rows || !rows.length) return alert('No data available to export');
    const keys = Object.keys(rows[0]);
    const csvContent = [
      keys.join(','),
      ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export Handler
  const exportToPdf = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('admin-report-content');
      if (!element) return alert('Report content not found');

      const opt = {
        margin: 8,
        filename: `Admin_Financial_Report_${financialYear}.pdf`,
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

  const printReport = () => {
    window.print();
  };

  const summary = finData?.summary || {};
  const monthlyBreakdown = finData?.monthlyBreakdown || [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Society Financial & Accounting Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dual-Account System: Independent BANK vs. CASH balances with Indian Financial Year calculations
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
            className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 px-3.5 py-2 rounded-xl text-sm font-semibold border border-blue-200 dark:border-blue-800 transition"
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
            onClick={() => exportToCsv(`Financial_Report_${financialYear}.csv`, monthlyBreakdown)}
            className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-xl text-sm font-semibold border border-emerald-200 dark:border-emerald-800 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel / CSV
          </button>

          <button
            onClick={exportToPdf}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>

          <button
            onClick={printReport}
            className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-4 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto gap-2">
        {[
          { id: 'summary', label: 'Financial Summary & Monthly', icon: WalletCards },
          { id: 'bankLedger', label: 'Bank Ledger Account', icon: Landmark },
          { id: 'cashLedger', label: 'Cash Ledger Account', icon: Wallet },
          { id: 'flats', label: 'Flat Collection Status', icon: Building2 },
          { id: 'writeoffs', label: 'Write-Offs & Penalties', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
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
            {/* 1. FINANCIAL SUMMARY CARDS */}
            {activeTab === 'summary' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Balances */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-sm space-y-2">
                    <div className="text-xs uppercase font-bold tracking-wider opacity-80">Total Closing Balance</div>
                    <div className="text-2xl font-extrabold">{money(summary.totalClosing)}</div>
                    <div className="text-xs opacity-90 pt-1 border-t border-white/20 flex justify-between">
                      <span>Opening: {moneyShort(summary.totalOpening)}</span>
                      <span>Collection: {summary.collectionPercentage}%</span>
                    </div>
                  </div>

                  {/* Bank Account */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                      <span>Bank Account</span>
                      <Landmark className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">{money(summary.bankClosing)}</div>
                    <div className="text-xs text-slate-500 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between"><span>Bank Income:</span><span className="text-emerald-600 font-semibold">+{moneyShort(summary.bankIncome)}</span></div>
                      <div className="flex justify-between"><span>Bank Expense:</span><span className="text-rose-600 font-semibold">-{moneyShort(summary.bankExpense)}</span></div>
                    </div>
                  </div>

                  {/* Cash Account */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                      <span>Cash Account</span>
                      <Wallet className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">{money(summary.cashClosing)}</div>
                    <div className="text-xs text-slate-500 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between"><span>Cash Income:</span><span className="text-emerald-600 font-semibold">+{moneyShort(summary.cashIncome)}</span></div>
                      <div className="flex justify-between"><span>Cash Expense:</span><span className="text-rose-600 font-semibold">-{moneyShort(summary.cashExpense)}</span></div>
                    </div>
                  </div>

                  {/* Dues & Pending */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                      <span>Pending Collection</span>
                      <IndianRupee className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{money(summary.pendingMaintenance)}</div>
                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                      <span>Total Income:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{moneyShort(summary.totalIncome)}</span>
                    </div>
                  </div>
                </div>

                {/* MONTHLY SUMMARY TABLE */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      Monthly Breakdown (FY {financialYear})
                    </h3>
                    <span className="text-xs text-slate-500">Click any row for detailed breakdown</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-4">Month</th>
                          <th className="p-4">Opening Balance</th>
                          <th className="p-4 text-emerald-600 dark:text-emerald-400">Income</th>
                          <th className="p-4 text-rose-600 dark:text-rose-400">Expense</th>
                          <th className="p-4 font-extrabold text-blue-600 dark:text-blue-400">Closing Balance</th>
                          <th className="p-4">Net Surplus / Deficit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {monthlyBreakdown.map((row, idx) => (
                          <tr
                            key={idx}
                            onClick={() => setSelectedMonth(row)}
                            className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 cursor-pointer transition"
                          >
                            <td className="p-4 font-bold text-slate-900 dark:text-white">{formatMonthName(row.month)} {row.year}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-300">
                              <div className="font-semibold">{moneyShort(row.totalOpening)}</div>
                              <div className="text-[10px] text-slate-400">Bank: {moneyShort(row.bankOpening)} | Cash: {moneyShort(row.cashOpening)}</div>
                            </td>
                            <td className="p-4 text-emerald-600 font-semibold">
                              <div>+{moneyShort(row.totalIncome)}</div>
                              <div className="text-[10px] opacity-75">Bank: +{moneyShort(row.bankIncome)} | Cash: +{moneyShort(row.cashIncome)}</div>
                            </td>
                            <td className="p-4 text-rose-600 font-semibold">
                              <div>-{moneyShort(row.totalExpense)}</div>
                              <div className="text-[10px] opacity-75">Bank: -{moneyShort(row.bankExpense)} | Cash: -{moneyShort(row.cashExpense)}</div>
                            </td>
                            <td className="p-4 font-extrabold text-slate-900 dark:text-white">
                              <div>{moneyShort(row.totalClosing)}</div>
                              <div className="text-[10px] text-slate-400 font-normal">Bank: {moneyShort(row.bankClosing)} | Cash: {moneyShort(row.cashClosing)}</div>
                            </td>
                            <td className="p-4 font-bold">
                              {row.netSurplus > 0 ? (
                                <span className="text-emerald-600">+ {moneyShort(row.netSurplus)}</span>
                              ) : row.netDeficit > 0 ? (
                                <span className="text-rose-600">- {moneyShort(row.netDeficit)}</span>
                              ) : (
                                <span className="text-slate-400">₹0</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* 2. BANK LEDGER */}
            {activeTab === 'bankLedger' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden space-y-4 p-5">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <Landmark className="w-5 h-5 text-blue-600" />
                      Bank Account Ledger
                    </h3>
                    <p className="text-xs text-slate-500">
                      Opening Balance: {money(bankLedger?.openingBalance)} | Closing Balance: {money(bankLedger?.closingBalance)}
                    </p>
                  </div>
                  <button
                    onClick={() => exportToCsv(`Bank_Ledger_${financialYear}.csv`, bankLedger?.ledger || [])}
                    className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-semibold"
                  >
                    Export Bank Ledger CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Reference</th>
                        <th className="p-3 text-emerald-600">Income (+)</th>
                        <th className="p-3 text-rose-600">Expense (-)</th>
                        <th className="p-3 text-blue-600 font-extrabold">Running Balance</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {(bankLedger?.ledger || []).map((t, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{formatDate(t.date)}</td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{t.transaction_type}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{t.description}</td>
                          <td className="p-3 font-mono text-xs text-slate-500">{t.reference}</td>
                          <td className="p-3 font-semibold text-emerald-600">{t.income > 0 ? `+${moneyShort(t.income)}` : '—'}</td>
                          <td className="p-3 font-semibold text-rose-600">{t.expense > 0 ? `-${moneyShort(t.expense)}` : '—'}</td>
                          <td className="p-3 font-extrabold text-slate-900 dark:text-white">{moneyShort(t.runningBalance)}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {t.approval_status || 'Approved'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. CASH LEDGER */}
            {activeTab === 'cashLedger' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden space-y-4 p-5">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-amber-500" />
                      Cash Account Ledger
                    </h3>
                    <p className="text-xs text-slate-500">
                      Opening Balance: {money(cashLedger?.openingBalance)} | Closing Balance: {money(cashLedger?.closingBalance)}
                    </p>
                  </div>
                  <button
                    onClick={() => exportToCsv(`Cash_Ledger_${financialYear}.csv`, cashLedger?.ledger || [])}
                    className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-semibold"
                  >
                    Export Cash Ledger CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Transaction Type</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-emerald-600">Income (+)</th>
                        <th className="p-3 text-rose-600">Expense (-)</th>
                        <th className="p-3 text-amber-600 font-extrabold">Running Balance</th>
                        <th className="p-3">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {(cashLedger?.ledger || []).map((t, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{formatDate(t.date)}</td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{t.transaction_type}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{t.description}</td>
                          <td className="p-3 font-semibold text-emerald-600">{t.income > 0 ? `+${moneyShort(t.income)}` : '—'}</td>
                          <td className="p-3 font-semibold text-rose-600">{t.expense > 0 ? `-${moneyShort(t.expense)}` : '—'}</td>
                          <td className="p-3 font-extrabold text-slate-900 dark:text-white">{moneyShort(t.runningBalance)}</td>
                          <td className="p-3 text-xs text-slate-500">{t.recorded_by || 'Admin'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. FLAT COLLECTION STATUS */}
            {activeTab === 'flats' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Flat-Wise Maintenance Collection Report
                  </h3>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <select
                      value={flatFilters.wing}
                      onChange={(e) => setFlatFilters({ ...flatFilters, wing: e.target.value })}
                      className="bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border-none outline-none"
                    >
                      <option value="All">All Wings</option>
                      <option value="A">Wing A</option>
                      <option value="B">Wing B</option>
                      <option value="C">Wing C</option>
                    </select>

                    <select
                      value={flatFilters.status}
                      onChange={(e) => setFlatFilters({ ...flatFilters, status: e.target.value })}
                      className="bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border-none outline-none"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                      <option value="Overdue">Overdue</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Search Flat No..."
                      value={flatFilters.flatNo}
                      onChange={(e) => setFlatFilters({ ...flatFilters, flatNo: e.target.value })}
                      className="bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border-none outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase">
                      <tr>
                        <th className="p-3">Flat & Wing</th>
                        <th className="p-3">Resident</th>
                        <th className="p-3">Month</th>
                        <th className="p-3">Opening Dues</th>
                        <th className="p-3">Bill Amount</th>
                        <th className="p-3 text-emerald-600">Paid Amount</th>
                        <th className="p-3 text-rose-600">Closing Dues</th>
                        <th className="p-3">Payment Date</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {flatReport.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            Wing {row.wing} - {row.flat_no}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">{row.resident_name || '—'}</td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{formatMonthName(row.month)} {row.year}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{moneyShort(row.opening_outstanding || 0)}</td>
                          <td className="p-3 font-semibold">{moneyShort(row.bill_amount)}</td>
                          <td className="p-3 text-emerald-600 font-semibold">{moneyShort(row.paid_amount)}</td>
                          <td className="p-3 text-rose-600 font-semibold">{moneyShort(row.closing_outstanding ?? row.pending_amount)}</td>
                          <td className="p-3 text-xs text-slate-500">{formatDate(row.payment_date)}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-bold ${
                                String(row.status).toLowerCase() === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. WRITE-OFFS & PENALTIES */}
            {activeTab === 'writeoffs' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden space-y-4 p-5">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Write-Off & Penalty Adjustment History
                  </h3>
                  <span className="text-xs text-slate-500">Note: Write-Offs reduce outstanding dues but never count as Income</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Flat & Resident</th>
                        <th className="p-3">Write-Off Type</th>
                        <th className="p-3 text-rose-600">Amount</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Approved By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {writeOffs.map((w, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{formatDate(w.created_at)}</td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                            {w.resident_name} (Flat {w.flat_no})
                          </td>
                          <td className="p-3 font-bold text-purple-600">{w.writeoff_type}</td>
                          <td className="p-3 font-bold text-rose-600">{moneyShort(w.amount)}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{w.reason}</td>
                          <td className="p-3 text-xs text-slate-500">{w.admin_name || 'Management'}</td>
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

      {/* MONTH DETAILS MODAL */}
      {selectedMonth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Month Details: {formatMonthName(selectedMonth.month)} {selectedMonth.year}
                </h3>
                <p className="text-xs text-slate-500">Comprehensive Financial & Dues Breakdown</p>
              </div>
              <button onClick={() => setSelectedMonth(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {/* Opening Section */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl space-y-1">
                <div className="flex justify-between font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1">
                  <span>Opening Balance</span>
                  <span>{money(selectedMonth.totalOpening)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Bank Opening: {moneyShort(selectedMonth.bankOpening)}</span>
                  <span>Cash Opening: {moneyShort(selectedMonth.cashOpening)}</span>
                </div>
              </div>

              {/* Income Breakdown */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl space-y-1 border border-emerald-100 dark:border-emerald-900/40">
                <div className="flex justify-between font-bold text-emerald-800 dark:text-emerald-300 border-b border-emerald-200/50 dark:border-emerald-800/40 pb-1">
                  <span>Income Breakdown</span>
                  <span>+{money(selectedMonth.totalIncome)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 dark:text-emerald-400">
                  <span>Bank Income: +{moneyShort(selectedMonth.bankIncome)}</span>
                  <span>Cash Income: +{moneyShort(selectedMonth.cashIncome)}</span>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl space-y-1 border border-rose-100 dark:border-rose-900/40">
                <div className="flex justify-between font-bold text-rose-800 dark:text-rose-300 border-b border-rose-200/50 dark:border-rose-800/40 pb-1">
                  <span>Expense Breakdown</span>
                  <span>-{money(selectedMonth.totalExpense)}</span>
                </div>
                <div className="flex justify-between text-xs text-rose-700 dark:text-rose-400">
                  <span>Bank Expense: -{moneyShort(selectedMonth.bankExpense)}</span>
                  <span>Cash Expense: -{moneyShort(selectedMonth.cashExpense)}</span>
                </div>
              </div>

              {/* Closing Section */}
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl space-y-1 border border-blue-200 dark:border-blue-800/60">
                <div className="flex justify-between font-extrabold text-blue-900 dark:text-blue-200 border-b border-blue-200/60 dark:border-blue-800/60 pb-1">
                  <span>Closing Balance</span>
                  <span>{money(selectedMonth.totalClosing)}</span>
                </div>
                <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300">
                  <span>Bank Closing: {moneyShort(selectedMonth.bankClosing)}</span>
                  <span>Cash Closing: {moneyShort(selectedMonth.cashClosing)}</span>
                </div>
              </div>

              {/* Pending Dues Section */}
              <div className="flex justify-between py-2.5 px-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl">
                <span className="font-bold text-amber-900 dark:text-amber-200">Pending Dues Amount</span>
                <span className="font-bold text-amber-900 dark:text-amber-200">{money(selectedMonth.pendingMaintenance || 0)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedMonth(null)}
                className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
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
