import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileBarChart, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { residentAPI } from '../services/api';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const monthName = (month) => month ? new Date(2026, Number(month) - 1).toLocaleDateString('en-IN', { month: 'short' }) : '-';

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const ResidentReports = () => {
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({ month: '', year: String(currentYear), status: '' });
  const [summary, setSummary] = useState(null);
  const [maintenance, setMaintenance] = useState([]);
  const [societySummary, setSocietySummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(() => {
    const next = {};
    if (filters.month) next.month = filters.month;
    if (filters.year) next.year = filters.year;
    return next;
  }, [filters.month, filters.year]);

  const maintenanceParams = useMemo(() => ({
    ...params,
    ...(filters.status ? { status: filters.status } : {})
  }), [params, filters.status]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, maintenanceRes, societyRes, expensesRes] = await Promise.all([
        residentAPI.getReportSummary(),
        residentAPI.getReportMaintenance(maintenanceParams),
        residentAPI.getSocietyReportSummary(params),
        residentAPI.getReportExpenses(params)
      ]);
      setSummary(summaryRes.data || {});
      setMaintenance(maintenanceRes.data || []);
      setSocietySummary(societyRes.data || {});
      setExpenses(expensesRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load resident reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadCsv = () => {
    const maintenanceRows = [
      ['Maintenance Report'],
      ['Month', 'Year', 'Title', 'Base Amount', 'Penalty', 'Total Amount', 'Paid Amount', 'Remaining Amount', 'Due Date', 'Payment Date', 'Status'],
      ...maintenance.map((item) => [
        monthName(item.month), item.year, item.title, item.amount, item.penalty_amount,
        item.total_amount, item.paid_amount, item.remaining_amount, fullDate(item.due_date),
        fullDate(item.payment_date), item.status
      ]),
      [],
      ['Expenses Report'],
      ['Expense Title', 'Category', 'Amount', 'Date', 'Description'],
      ...expenses.map((item) => [item.expense_title, item.category, item.amount, fullDate(item.date), item.description])
    ];
    const csv = maintenanceRows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resident-reports-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadPdf = () => {
    const html = `
      <html><head><title>Resident Reports</title><style>
      body{font-family:Arial,sans-serif;padding:28px;color:#172033} h1{margin:0 0 12px}
      table{width:100%;border-collapse:collapse;margin:18px 0 28px;font-size:11px}
      th,td{border:1px solid #dfe5ee;padding:7px;text-align:left} th{background:#f3f6fa}
      .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}
      .card{border:1px solid #dfe5ee;border-radius:8px;padding:10px}.card span{display:block;color:#667085;font-size:11px}.card strong{font-size:16px}
      </style></head><body>
      <h1>Resident Reports</h1>
      <div class="cards">
        <div class="card"><span>Flat</span><strong>${summary?.flat?.flat_no || 'N/A'}</strong></div>
        <div class="card"><span>Total Bills</span><strong>${summary?.totalBills || 0}</strong></div>
        <div class="card"><span>Pending</span><strong>${money(summary?.totalPendingAmount)}</strong></div>
      </div>
      <h2>My Maintenance Report</h2>
      <table><thead><tr><th>Month</th><th>Year</th><th>Title</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead>
      <tbody>${maintenance.map((item) => `<tr><td>${monthName(item.month)}</td><td>${item.year || ''}</td><td>${item.title || ''}</td><td>${money(item.total_amount)}</td><td>${money(item.paid_amount)}</td><td>${money(item.remaining_amount)}</td><td>${item.status || ''}</td></tr>`).join('')}</tbody></table>
      <h2>Expenses Report</h2>
      <table><thead><tr><th>Expense</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead>
      <tbody>${expenses.map((item) => `<tr><td>${item.expense_title || ''}</td><td>${item.category || ''}</td><td>${money(item.amount)}</td><td>${fullDate(item.date)}</td></tr>`).join('')}</tbody></table>
      <script>window.print();</script></body></html>`;
    const printWindow = window.open('', '_blank', 'width=1000,height=750');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const updateFilter = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  if (loading) return <div className="loading-spinner">Loading reports...</div>;

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div><h1>Reports</h1><p>Read-only maintenance, payment and society expense reports.</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="portal-light-btn" onClick={downloadPdf}><Download size={15} /> PDF</button>
          <button className="portal-light-btn" onClick={downloadCsv}><FileSpreadsheet size={15} /> CSV</button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">Month<select name="month" value={filters.month} onChange={updateFilter} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900"><option value="">All</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">Year<input name="year" type="number" value={filters.year} onChange={updateFilter} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" /></label>
        <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">Status<select name="status" value={filters.status} onChange={updateFilter} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900"><option value="">All</option><option>Pending</option><option>Under Review</option><option>Paid</option><option>Overdue</option><option>Partial</option></select></label>
        <button className="portal-primary-btn self-end" onClick={load}><RefreshCw size={15} /> Apply Filters</button>
      </div>

      <div className="portal-kpis">
        <div className="portal-kpi"><span>My Flat Number</span><strong>{summary?.flat?.flat_no || 'N/A'}</strong><small>Wing {summary?.flat?.wing || '-'}</small></div>
        <div className="portal-kpi"><span>Total Bills</span><strong>{summary?.totalBills || 0}</strong><small>My maintenance bills</small></div>
        <div className="portal-kpi green"><span>Total Paid</span><strong>{money(summary?.totalPaidAmount)}</strong><small>Approved payments</small></div>
        <div className="portal-kpi orange"><span>Total Pending</span><strong>{money(summary?.totalPendingAmount)}</strong><small>Remaining amount</small></div>
        <div className="portal-kpi red"><span>Total Penalty</span><strong>{money(summary?.totalPenaltyAmount)}</strong><small>Late charges</small></div>
        <div className="portal-kpi green"><span>Current Month</span><strong>{summary?.currentMonthStatus || 'No Bill'}</strong><small>Status</small></div>
      </div>

      <section className="portal-panel portal-table-card mb-4">
        <div className="portal-panel-head"><div><h2>My Maintenance Report</h2><p>Only your logged-in account history is shown.</p></div></div>
        <div className="portal-table-wrap">
          <table className="portal-data-table">
            <thead><tr><th>Month</th><th>Year</th><th>Maintenance Title</th><th>Base Amount</th><th>Penalty</th><th>Total Amount</th><th>Paid Amount</th><th>Remaining Amount</th><th>Due Date</th><th>Payment Date</th><th>Status</th></tr></thead>
            <tbody>{maintenance.map((item) => <tr key={item.id}><td>{monthName(item.month)}</td><td>{item.year || '-'}</td><td><strong>{item.title || 'Maintenance Bill'}</strong></td><td>{money(item.amount)}</td><td>{money(item.penalty_amount)}</td><td>{money(item.total_amount)}</td><td>{money(item.paid_amount)}</td><td>{money(item.remaining_amount)}</td><td>{fullDate(item.due_date)}</td><td>{fullDate(item.payment_date)}</td><td><span className={`portal-status ${String(item.status).toLowerCase().replace(' ', '_')}`}>{item.status}</span></td></tr>)}</tbody>
          </table>
          {!maintenance.length && <div className="portal-empty">No report data found.</div>}
        </div>
      </section>

      <section className="portal-panel mb-4">
        <div className="portal-panel-head"><div><h2>Society Annual Report</h2><p>View-only society collection and expense summary.</p></div><FileBarChart size={16} /></div>
        <div className="settings-status-grid">
          <div><span>Total Society Collection</span><strong>{money(societySummary?.totalSocietyCollection)}</strong></div>
          <div><span>Total Society Expenses</span><strong>{money(societySummary?.totalSocietyExpenses)}</strong></div>
          <div><span>Net Balance</span><strong>{money(societySummary?.netBalance)}</strong></div>
          <div><span>Collection Rate</span><strong>{societySummary?.collectionRate || 0}%</strong></div>
          <div><span>Paid Bills Count</span><strong>{societySummary?.paidBillsCount || 0}</strong></div>
          <div><span>Pending Bills Count</span><strong>{societySummary?.pendingBillsCount || 0}</strong></div>
          <div><span>Overdue Bills Count</span><strong>{societySummary?.overdueBillsCount || 0}</strong></div>
        </div>
      </section>

      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head"><div><h2>Expenses Report</h2><p>Society expenses are read-only for residents.</p></div></div>
        <div className="portal-table-wrap">
          <table className="portal-data-table">
            <thead><tr><th>Expense Title</th><th>Category</th><th>Amount</th><th>Date</th><th>Description</th></tr></thead>
            <tbody>{expenses.map((item) => <tr key={item.id}><td><strong>{item.expense_title || item.expense_number}</strong></td><td>{item.category}</td><td>{money(item.amount)}</td><td>{fullDate(item.date)}</td><td>{item.description || <span className="portal-muted-text">No description</span>}</td></tr>)}</tbody>
          </table>
          {!expenses.length && <div className="portal-empty">No report data found.</div>}
        </div>
      </section>
    </div>
  );
};

export default ResidentReports;
