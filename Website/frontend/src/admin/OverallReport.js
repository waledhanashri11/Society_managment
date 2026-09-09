/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, Calendar, Download, IndianRupee, Printer,
  RefreshCw, Search, TrendingDown, TrendingUp, Users, WalletCards
} from 'lucide-react';
import { overallReportAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';

const MONTHS = ['All months', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const money = (value) => `₹ ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
const currentFY = () => {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
};
const date = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const statusClass = (value = '') => {
  const status = String(value).toLowerCase();
  if (status === 'paid' || status === 'approved') return 'portal-status paid';
  if (status.includes('pending') || status.includes('partial')) return 'portal-status pending';
  return 'portal-status open';
};

const defaultFilters = { financialYear: currentFY(), month: '', transactionType: '', paymentMode: '', status: '', search: '', page: 1 };

export default function OverallReport() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [applied, setApplied] = useState(defaultFilters);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailTab, setDetailTab] = useState('transactions');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(Object.entries(applied).filter(([, value]) => value !== '' && value !== null));
      const response = await overallReportAPI.get(params);
      setReport(response.data?.data || response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load the overall report.');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => { load(); }, [load]);

  const set = (key, value) => setFilters((old) => ({ ...old, [key]: value, page: 1 }));
  const applyFilters = (event) => { event.preventDefault(); setApplied({ ...filters, page: 1 }); };
  const resetFilters = () => { setFilters(defaultFilters); setApplied(defaultFilters); };
  const summary = report?.summary || {};
  const rows = useMemo(() => ({
    transactions: report?.transactions || [],
    collections: report?.collections || [],
    pending: report?.pending || [],
    expenses: report?.expenses || [],
    monthly: report?.months || []
  }), [report]);

  const exportCsv = () => {
    const data = rows[detailTab];
    if (!data?.length) return window.alert('No data to export for this section.');
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map((row) => headers.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `overall-report-${applied.financialYear}-${detailTab}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const goToPage = (page) => {
    const next = { ...applied, page };
    setFilters((old) => ({ ...old, page }));
    setApplied(next);
  };

  return (
    <div className="portal-module reports-module" style={{ width: '100%' }}>
      <div className="portal-page-title">
        <div>
          <button className="portal-link-button" onClick={() => navigate('/admin/reports')} style={{ marginBottom: 8 }}>
            <ArrowLeft size={15} /> Back to Financial Reports
          </button>
          <h1>Overall Society Report</h1>
          <p>Complete income, expenses, collections, dues, and transaction statement in one place</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="portal-light-btn" onClick={load}><RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh</button>
          <button className="portal-light-btn" onClick={exportCsv} style={{ color: '#079447' }}><Download size={15} /> Export CSV</button>
          <button className="portal-primary-btn" onClick={() => window.print()}><Printer size={15} /> Print / PDF</button>
        </div>
      </div>

      <form className="portal-panel" onSubmit={applyFilters} style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, alignItems: 'end' }}>
          <label>Financial year<select value={filters.financialYear} onChange={(e) => set('financialYear', e.target.value)}>{[0,1,2,3].map((n) => { const start = Number(currentFY().slice(0,4)) - n; return <option key={start} value={`${start}-${start + 1}`}>{start}-{start + 1}</option>; })}</select></label>
          <label>Month<select value={filters.month} onChange={(e) => set('month', e.target.value)}>{MONTHS.map((month, index) => <option key={month} value={index || ''}>{month}</option>)}</select></label>
          <label>Transaction type<select value={filters.transactionType} onChange={(e) => set('transactionType', e.target.value)}><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select></label>
          <label>Payment mode<select value={filters.paymentMode} onChange={(e) => set('paymentMode', e.target.value)}><option value="">All modes</option><option value="Cash">Cash</option><option value="Bank">Bank</option><option value="UPI">UPI</option><option value="Cheque">Cheque</option></select></label>
          <label>Status<select value={filters.status} onChange={(e) => set('status', e.target.value)}><option value="">All statuses</option><option value="paid">Paid</option><option value="approved">Approved</option><option value="pending">Pending</option><option value="partially paid">Partially paid</option></select></label>
          <label>Search<div style={{ position: 'relative' }}><Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#667085' }} /><input value={filters.search} onChange={(e) => set('search', e.target.value)} placeholder="Resident, flat, reference…" style={{ paddingLeft: 32, width: '100%' }} /></div></label>
          <div style={{ display: 'flex', gap: 8 }}><button className="portal-primary-btn" type="submit">Apply</button><button className="portal-light-btn" type="button" onClick={resetFilters}>Reset</button></div>
        </div>
      </form>

      {error && <div className="portal-error" style={{ marginBottom: 20 }}>{error}</div>}
      {loading && !report ? <CardSkeleton count={4} /> : report && <>
        <div className="portal-kpis" style={{ marginBottom: 20 }}>
          <article className="portal-kpi green"><span>TOTAL COLLECTION</span><strong>{money(summary.totalCollection)}</strong><small>Approved maintenance receipts</small><div className="portal-kpi-icon"><IndianRupee size={17} /></div></article>
          <article className="portal-kpi red"><span>TOTAL EXPENSES</span><strong style={{ color: '#dc2626' }}>{money(summary.totalExpenses)}</strong><small>Paid operational expenses</small><div className="portal-kpi-icon"><TrendingDown size={17} /></div></article>
          <article className={`portal-kpi ${Number(summary.netBalance) >= 0 ? 'green' : 'red'}`}><span>NET BALANCE</span><strong>{money(summary.netBalance)}</strong><small>Collection minus expenses</small><div className="portal-kpi-icon"><TrendingUp size={17} /></div></article>
          <article className="portal-kpi"><span>MAINTENANCE GENERATED</span><strong>{money(summary.maintenanceGenerated)}</strong><small>Total bills and penalties</small><div className="portal-kpi-icon"><WalletCards size={17} /></div></article>
          <article className="portal-kpi red"><span>PENDING AMOUNT</span><strong style={{ color: '#dc2626' }}>{money(summary.pendingAmount)}</strong><small>{summary.pendingResidents || 0} residents pending</small><div className="portal-kpi-icon"><Users size={17} /></div></article>
          <article className="portal-kpi"><span>WRITE-OFFS</span><strong>{money(summary.writeOffAmount)}</strong><small>{summary.totalTransactions || 0} total transactions</small><div className="portal-kpi-icon"><BarChart3 size={17} /></div></article>
        </div>

        <div className="portal-panel portal-table-card">
          <div className="portal-panel-head">
            <div><h2>{report.societyName} — FY {report.financialYear}</h2><p><Calendar size={13} style={{ verticalAlign: -2 }} /> Reporting period {date(report.period?.from)} onward</p></div>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', overflowX: 'auto' }}>
            {[['transactions','Transactions'],['collections','Collections'],['pending','Pending Dues'],['expenses','Expenses'],['monthly','Monthly Summary']].map(([id,label]) => <button key={id} className={detailTab === id ? 'portal-primary-btn' : 'portal-light-btn'} onClick={() => setDetailTab(id)}>{label} ({rows[id].length})</button>)}
          </div>
          <ReportTable type={detailTab} rows={rows[detailTab]} />
          {detailTab === 'transactions' && report.pagination?.totalPages > 1 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}><span>Page {report.pagination.page} of {report.pagination.totalPages} · {report.pagination.totalRecords} records</span><div style={{ display: 'flex', gap: 8 }}><button className="portal-light-btn" disabled={report.pagination.page <= 1} onClick={() => goToPage(report.pagination.page - 1)}>Previous</button><button className="portal-light-btn" disabled={report.pagination.page >= report.pagination.totalPages} onClick={() => goToPage(report.pagination.page + 1)}>Next</button></div></div>}
        </div>
      </>}
    </div>
  );
}

function ReportTable({ type, rows }) {
  const columns = {
    transactions: [['date','Date'],['transactionId','Reference'],['type','Type'],['residentOrParty','Resident / Party'],['flat','Flat'],['description','Description'],['paymentMode','Mode'],['credit','Credit'],['debit','Debit'],['balance','Balance'],['status','Status']],
    collections: [['date','Date'],['resident','Resident'],['flat','Flat'],['billMonth','Bill month'],['billAmount','Bill'],['penalty','Penalty'],['writeOff','Write-off'],['amountPaid','Paid'],['remaining','Remaining'],['paymentMode','Mode'],['status','Status']],
    pending: [['resident','Resident'],['flat','Flat'],['month','Month'],['originalBill','Original bill'],['penalty','Penalty'],['writeOff','Write-off'],['paid','Paid'],['remaining','Remaining'],['status','Status']],
    expenses: [['date','Date'],['category','Category'],['description','Description'],['vendor','Vendor'],['amount','Amount'],['paymentMode','Mode'],['status','Status']],
    monthly: [['month','Month'],['year','Year'],['totalCollection','Collection'],['totalExpenses','Expenses'],['netBalance','Net balance'],['maintenanceGenerated','Generated'],['pendingAmount','Pending'],['writeOffAmount','Write-offs']]
  };
  const moneyKeys = new Set(['credit','debit','balance','billAmount','penalty','writeOff','amountPaid','remaining','originalBill','paid','amount','totalCollection','totalExpenses','netBalance','maintenanceGenerated','pendingAmount','writeOffAmount']);
  const dateKeys = new Set(['date']);
  return <div className="portal-table-wrap"><table className="portal-data-table portal-data-table-wide"><thead><tr>{columns[type].map(([, label]) => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={row.id || index}>{columns[type].map(([key]) => <td key={key}>{key === 'status' ? <span className={statusClass(row[key])}>{row[key] || '—'}</span> : key === 'month' && type === 'monthly' ? MONTHS[Number(row[key])] : moneyKeys.has(key) ? <strong style={{ color: ['debit','totalExpenses','remaining','pendingAmount'].includes(key) ? '#dc2626' : undefined }}>{money(row[key])}</strong> : dateKeys.has(key) ? date(row[key]) : row[key] || '—'}</td>)}</tr>) : <tr><td colSpan={columns[type].length} className="portal-empty" style={{ padding: 36 }}>No records found for the selected filters.</td></tr>}</tbody></table></div>;
}
