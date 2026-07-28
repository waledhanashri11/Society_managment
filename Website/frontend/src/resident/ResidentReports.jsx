/* eslint-disable */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Lock,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';

import { residentAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';

const money = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const moneyShort = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

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
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Resident Account & Society Transparency Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500 inline" />
            Privacy-enforced report: Personal payment statement + Society financial transparency
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* FY Picker */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-xl text-sm font-semibold">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-slate-600 dark:text-slate-300">FY:</span>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white border-none outline-none cursor-pointer"
            >
              {['2026-2027', '2025-2026', '2024-2025'].map((fy) => (
                <option key={fy} value={fy} className="text-slate-900 dark:text-slate-900">
                  {fy}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={exportPdf}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export PDF
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
        <button
          onClick={() => setActiveTab('myAccount')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'myAccount'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          My Account Statement
        </button>

        <button
          onClick={() => setActiveTab('transparency')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'transparency'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Landmark className="w-4 h-4" />
          Society Financial Transparency
        </button>
      </div>

      <div id="resident-report-content" className="space-y-6">
        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          <>
            {/* 1. MY ACCOUNT STATEMENT */}
            {activeTab === 'myAccount' && (
              <div className="space-y-6">
                {/* Account Formula Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Closing Dues */}
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm space-y-2">
                    <div className="text-xs uppercase font-bold tracking-wider opacity-80">Closing Outstanding Dues</div>
                    <div className="text-2xl font-extrabold">{money(accSummary.closingOutstanding)}</div>
                    <div className="text-xs opacity-90 pt-1 border-t border-white/20 flex justify-between">
                      <span>Resident: {resident.name || 'Resident'}</span>
                      <span>Flat {resident.flatNo || '—'}</span>
                    </div>
                  </div>

                  {/* Bills Generated */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                      <span>Bills Generated</span>
                      <CreditCard className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">{money(accSummary.billsGenerated)}</div>
                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                      <span>Penalties:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{moneyShort(accSummary.totalPenalty)}</span>
                    </div>
                  </div>

                  {/* Approved Payments */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                      <span>Approved Payments</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">+{money(accSummary.approvedPayments)}</div>
                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                      <span>Verification Pending:</span>
                      <span className="font-semibold text-amber-600">{accSummary.verificationPendingCount || 0} payments</span>
                    </div>
                  </div>

                  {/* Write-offs Approved */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                      <span>Approved Write-Offs</span>
                      <FileText className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">-{money(accSummary.approvedWriteOffs)}</div>
                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                      <span>Formula:</span>
                      <span className="text-xs font-mono">Dues = Bills - Paid - WriteOff</span>
                    </div>
                  </div>
                </div>

                {/* Personal Maintenance Bills Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      My Maintenance Bills Statement (FY {financialYear})
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase">
                        <tr>
                          <th className="p-4">Bill Date / Period</th>
                          <th className="p-4">Bill Amount</th>
                          <th className="p-4 text-emerald-600">Paid Amount</th>
                          <th className="p-4 text-purple-600">Write-Off</th>
                          <th className="p-4 text-rose-600">Pending Amount</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {(accountData?.bills || []).map((bill, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="p-4 font-semibold text-slate-900 dark:text-white">
                              Month {bill.month} / {bill.year}
                              <div className="text-xs font-normal text-slate-500">Due: {formatDate(bill.due_date)}</div>
                            </td>
                            <td className="p-4 font-semibold">{moneyShort(bill.bill_amount)}</td>
                            <td className="p-4 text-emerald-600 font-semibold">{moneyShort(bill.paid_amount)}</td>
                            <td className="p-4 text-purple-600 font-semibold">{moneyShort(bill.write_off_amount)}</td>
                            <td className="p-4 text-rose-600 font-semibold">{moneyShort(bill.pending_amount)}</td>
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  String(bill.status).toLowerCase() === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {bill.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. SOCIETY FINANCIAL TRANSPARENCY */}
            {activeTab === 'transparency' && (
              <div className="space-y-6">
                {/* Privacy Badge Banner */}
                <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 p-4 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 flex-shrink-0 text-blue-600" />
                    <span className="text-xs md:text-sm">
                      <strong>Privacy Protected:</strong> Personal phone numbers, email addresses, bank accounts, UPI IDs, documents, and screenshots are strictly hidden to ensure security compliance.
                    </span>
                  </div>
                </div>

                {/* Society Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-xs uppercase font-bold text-slate-500">Society Total Opening</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">{money(transSummary.totalOpening)}</div>
                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                      <span>Bank: {moneyShort(transSummary.bankOpening)}</span>
                      <span>Cash: {moneyShort(transSummary.cashOpening)}</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-xs uppercase font-bold text-emerald-600">Approved Society Income</div>
                    <div className="text-xl font-bold text-emerald-600">{money(transSummary.totalIncome)}</div>
                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                      <span>Bank: {moneyShort(transSummary.bankIncome)}</span>
                      <span>Cash: {moneyShort(transSummary.cashIncome)}</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-xs uppercase font-bold text-rose-600">Approved Society Expense</div>
                    <div className="text-xl font-bold text-rose-600">{money(transSummary.totalExpense)}</div>
                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                      <span>Bank: {moneyShort(transSummary.bankExpense)}</span>
                      <span>Cash: {moneyShort(transSummary.cashExpense)}</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-xs uppercase font-bold text-blue-600">Society Closing Balance</div>
                    <div className="text-xl font-bold text-blue-600">{money(transSummary.totalClosing)}</div>
                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                      <span>Bank: {moneyShort(transSummary.bankClosing)}</span>
                      <span>Cash: {moneyShort(transSummary.cashClosing)}</span>
                    </div>
                  </div>
                </div>

                {/* Approved Expenses Transparency Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      Approved Society Expenses (Transparency View)
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Description</th>
                          <th className="p-3">Vendor</th>
                          <th className="p-3 text-rose-600">Amount</th>
                          <th className="p-3">Account</th>
                          <th className="p-3">Approved By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {(transparencyData?.approvedExpenses || []).map((exp, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{formatDate(exp.expense_date)}</td>
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{exp.category}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{exp.description}</td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">{exp.vendor}</td>
                            <td className="p-3 font-bold text-rose-600">-{moneyShort(exp.amount)}</td>
                            <td className="p-3 font-semibold text-xs text-blue-600">{exp.payment_account || 'BANK'}</td>
                            <td className="p-3 text-xs text-slate-500">{exp.approved_by || 'Management'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Flat Payment Status Transparency Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      Flat Maintenance Collection Status (Sanitized View)
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase">
                        <tr>
                          <th className="p-3">Flat & Wing</th>
                          <th className="p-3">Bill Month</th>
                          <th className="p-3">Bill Amount</th>
                          <th className="p-3 text-emerald-600">Paid Amount</th>
                          <th className="p-3 text-rose-600">Pending Amount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Payment Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {(transparencyData?.flatPayments || []).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              Wing {row.wing} - {row.flat_no}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">Month {row.month}</td>
                            <td className="p-3 font-semibold">{moneyShort(row.bill_amount)}</td>
                            <td className="p-3 text-emerald-600 font-semibold">{moneyShort(row.paid_amount)}</td>
                            <td className="p-3 text-rose-600 font-semibold">{moneyShort(row.pending_amount)}</td>
                            <td className="p-3">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  String(row.status).toLowerCase() === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-slate-500">{formatDate(row.payment_date)}</td>
                          </tr>
                        ))}
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
