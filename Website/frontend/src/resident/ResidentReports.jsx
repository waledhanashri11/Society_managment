import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Download, FileBarChart, FileSpreadsheet,
  IndianRupee, MessageSquareWarning, RefreshCw, WalletCards
} from 'lucide-react';
import { complaintAPI, residentAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const monthName = (month) => month ? new Date(2026, Number(month) - 1).toLocaleDateString('en-IN', { month: 'short' }) : '-';
const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const statusKey = (status) => String(status || '').toLowerCase();
const isPaid = (status) => statusKey(status) === 'paid';
const isOpen = (status) => !isPaid(status) && statusKey(status) !== 'no bill';

const ResidentReports = () => {
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({ month: '', year: String(currentYear), status: '' });
  const [summary, setSummary] = useState({});
  const [myBills, setMyBills] = useState([]);
  const [membersMaintenance, setMembersMaintenance] = useState([]);
  const [societySummary, setSocietySummary] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [complaints, setComplaints] = useState([]);
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

    const results = await Promise.allSettled([
      residentAPI.getReportSummary(),
      residentAPI.getReportMaintenance(maintenanceParams),
      residentAPI.getSocietyReportSummary(params),
      residentAPI.getReportExpenses(params),
      residentAPI.getMembersMaintenanceReport(maintenanceParams),
      complaintAPI.getUserComplaints()
    ]);

    if (results[0].status === 'fulfilled') setSummary(results[0].value.data || {});
    if (results[1].status === 'fulfilled') setMyBills(results[1].value.data || []);
    if (results[2].status === 'fulfilled') setSocietySummary(results[2].value.data || {});
    if (results[3].status === 'fulfilled') setExpenses(results[3].value.data || []);
    if (results[4].status === 'fulfilled') setMembersMaintenance(results[4].value.data || []);
    if (results[5].status === 'fulfilled') setComplaints(results[5].value.data || []);

    if (results.some((result) => result.status === 'rejected')) {
      setError('Some report data could not be loaded. Please refresh after the backend/database is ready.');
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilter = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const created = complaint.created_at ? new Date(complaint.created_at) : null;
      if (!created || Number.isNaN(created.getTime())) return true;
      if (filters.month && created.getMonth() + 1 !== Number(filters.month)) return false;
      if (filters.year && created.getFullYear() !== Number(filters.year)) return false;
      return true;
    });
  }, [complaints, filters.month, filters.year]);

  const reports = useMemo(() => {
    const resolvedComplaints = filteredComplaints.filter((item) => item.status === 'resolved').length;
    const pendingComplaints = filteredComplaints.filter((item) => item.status === 'pending').length;
    const inProgressComplaints = filteredComplaints.filter((item) => item.status === 'in_progress').length;
    const paidBills = membersMaintenance.reduce((sum, item) => sum + Number(item.maintenance_status === 'Paid' ? item.total_bills || 0 : 0), 0);
    const pendingBills = membersMaintenance.reduce((sum, item) => sum + Number(isOpen(item.maintenance_status) ? item.total_bills || 0 : 0), 0);

    return {
      totalCollection: Number(societySummary.totalSocietyCollection || 0),
      pendingDues: Number(summary.totalPendingAmount || 0),
      totalExpenses: Number(societySummary.totalSocietyExpenses || 0),
      netBalance: Number(societySummary.netBalance || 0),
      collectionRate: Number(societySummary.collectionRate || 0),
      totalComplaints: filteredComplaints.length,
      resolvedComplaints,
      pendingComplaints,
      inProgressComplaints,
      paidBills: Number(societySummary.paidBillsCount || paidBills || 0),
      pendingBills: Number(societySummary.pendingBillsCount || pendingBills || 0),
      overdueBills: Number(societySummary.overdueBillsCount || 0)
    };
  }, [filteredComplaints, membersMaintenance, societySummary, summary.totalPendingAmount]);

  const downloadCsv = () => {
    const rows = [
      ['Resident Reports'],
      ['Total Collection', reports.totalCollection],
      ['Pending Dues', reports.pendingDues],
      ['Total Expenses', reports.totalExpenses],
      ['Net Balance', reports.netBalance],
      [],
      ['Maintenance Report'],
      ['Resident', 'Flat', 'Wing', 'Floor', 'Total Bills', 'Paid Amount', 'Pending Amount', 'Penalty', 'Status'],
      ...membersMaintenance.map((item) => [
        item.name, item.flat_no, item.wing, item.floor_no, item.total_bills,
        item.paid_amount, item.pending_amount, item.penalty_amount, item.maintenance_status
      ]),
      [],
      ['My Bills'],
      ['Month', 'Year', 'Title', 'Base Amount', 'Penalty', 'Total Amount', 'Paid Amount', 'Remaining Amount', 'Due Date', 'Payment Date', 'Status'],
      ...myBills.map((bill) => [
        monthName(bill.month), bill.year, bill.title, bill.amount, bill.penalty_amount,
        bill.total_amount, bill.paid_amount, bill.remaining_amount,
        fullDate(bill.due_date), fullDate(bill.payment_date), bill.status
      ]),
      [],
      ['Expenses'],
      ['Expense Title', 'Category', 'Amount', 'Date', 'Description'],
      ...expenses.map((expense) => [
        expense.expense_title || expense.expense_number,
        expense.category, expense.amount, fullDate(expense.date), expense.description
      ]),
      [],
      ['Complaints'],
      ['Title', 'Status', 'Date'],
      ...filteredComplaints.map((complaint) => [complaint.title, complaint.status, fullDate(complaint.created_at)])
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
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
      .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
      .card{border:1px solid #dfe5ee;border-radius:8px;padding:10px}.card span{display:block;color:#667085;font-size:11px}.card strong{font-size:16px}
      </style></head><body>
      <h1>Resident Reports</h1>
      <div class="cards">
        <div class="card"><span>Total Collection</span><strong>${money(reports.totalCollection)}</strong></div>
        <div class="card"><span>My Pending Dues</span><strong>${money(reports.pendingDues)}</strong></div>
        <div class="card"><span>Expenses</span><strong>${money(reports.totalExpenses)}</strong></div>
        <div class="card"><span>Net Balance</span><strong>${money(reports.netBalance)}</strong></div>
      </div>
      <h2>Maintenance Report</h2>
      <table><thead><tr><th>Resident</th><th>Flat</th><th>Total Bills</th><th>Paid</th><th>Pending</th><th>Status</th></tr></thead>
      <tbody>${membersMaintenance.map((item) => `<tr><td>${item.name || ''}</td><td>${item.flat_no || ''}</td><td>${item.total_bills || 0}</td><td>${money(item.paid_amount)}</td><td>${money(item.pending_amount)}</td><td>${item.maintenance_status || ''}</td></tr>`).join('')}</tbody></table>
      <h2>Expenses</h2>
      <table><thead><tr><th>Expense</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead>
      <tbody>${expenses.map((expense) => `<tr><td>${expense.expense_title || ''}</td><td>${expense.category || ''}</td><td>${money(expense.amount)}</td><td>${fullDate(expense.date)}</td></tr>`).join('')}</tbody></table>
      <script>window.print();</script></body></html>`;
    const printWindow = window.open('', '_blank', 'width=1000,height=750');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div><h1>Reports & Analytics</h1><p>Read-only financial, expense and complaint reports.</p></div>
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
        <button className="portal-primary-btn self-end" onClick={load}><RefreshCw size={15} /> Refresh Data</button>
      </div>

      {loading ? <CardSkeleton count={4} /> : <div className="portal-kpis">
        <div className="portal-kpi green"><span>Total Collection</span><strong>{money(reports.totalCollection)}</strong><small>{reports.paidBills} paid bills</small><div className="portal-kpi-icon"><IndianRupee size={18} /></div></div>
        <div className="portal-kpi orange"><span>My Pending Dues</span><strong>{money(reports.pendingDues)}</strong><small>{summary.totalBills || 0} my bills</small><div className="portal-kpi-icon"><WalletCards size={18} /></div></div>
        <div className="portal-kpi red"><span>Total Expenses</span><strong>{money(reports.totalExpenses)}</strong><small>Society spending</small><div className="portal-kpi-icon"><AlertTriangle size={18} /></div></div>
        <div className="portal-kpi green"><span>Net Balance</span><strong>{money(reports.netBalance)}</strong><small>{reports.collectionRate}% collection rate</small><div className="portal-kpi-icon"><CheckCircle2 size={18} /></div></div>
        <div className="portal-kpi"><span>Total Complaints</span><strong>{reports.totalComplaints}</strong><small>My requests</small><div className="portal-kpi-icon"><MessageSquareWarning size={18} /></div></div>
        <div className="portal-kpi green"><span>Resolved</span><strong>{reports.resolvedComplaints}</strong><small>Completed complaints</small><div className="portal-kpi-icon"><CheckCircle2 size={18} /></div></div>
      </div>}

      <section className="portal-panel mb-4">
        <div className="portal-panel-head"><div><h2>Society Annual Report</h2><p>Collection, expenses and bill status summary.</p></div><FileBarChart size={16} /></div>
        {loading ? <CardSkeleton count={4} /> : <div className="settings-status-grid">
          <div><span>Total Society Collection</span><strong>{money(reports.totalCollection)}</strong></div>
          <div><span>Total Society Expenses</span><strong>{money(reports.totalExpenses)}</strong></div>
          <div><span>Net Balance</span><strong>{money(reports.netBalance)}</strong></div>
          <div><span>Collection Rate</span><strong>{reports.collectionRate}%</strong></div>
          <div><span>Paid Bills Count</span><strong>{reports.paidBills}</strong></div>
          <div><span>Pending Bills Count</span><strong>{reports.pendingBills}</strong></div>
          <div><span>Overdue Bills Count</span><strong>{reports.overdueBills}</strong></div>
        </div>}
      </section>

      <section className="portal-panel portal-table-card mb-4">
        <div className="portal-panel-head"><div><h2>Maintenance Report</h2><p>Read-only society member maintenance summary.</p></div></div>
        <div className="portal-table-wrap">
          {loading ? <TableSkeleton rows={5} columns={5} /> : (
          <table className="portal-data-table">
            <thead><tr><th>Resident</th><th>Flat</th><th>Wing</th><th>Floor</th><th>Total Bills</th><th>Paid Amount</th><th>Pending Amount</th><th>Penalty</th><th>Status</th></tr></thead>
            <tbody>{membersMaintenance.map((item) => <tr key={item.id}><td><strong>{item.name || '-'}</strong></td><td>{item.flat_no || '-'}</td><td>{item.wing || '-'}</td><td>{item.floor_no ?? '-'}</td><td>{item.total_bills || 0}</td><td>{money(item.paid_amount)}</td><td>{money(item.pending_amount)}</td><td>{money(item.penalty_amount)}</td><td><span className={`portal-status ${statusKey(item.maintenance_status).replace(' ', '_')}`}>{item.maintenance_status || 'No Bill'}</span></td></tr>)}</tbody>
          </table>
          )}
          {!loading && !membersMaintenance.length && <div className="portal-empty">No report data found.</div>}
        </div>
      </section>

      <section className="portal-panel portal-table-card mb-4">
        <div className="portal-panel-head"><div><h2>My Bill Details</h2><p>Only your logged-in account history is shown.</p></div></div>
        <div className="portal-table-wrap">
          {loading ? <TableSkeleton rows={5} columns={5} /> : (
          <table className="portal-data-table">
            <thead><tr><th>Month</th><th>Year</th><th>Title</th><th>Base Amount</th><th>Penalty</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Due Date</th><th>Payment Date</th><th>Status</th></tr></thead>
            <tbody>{myBills.map((bill) => <tr key={bill.id}><td>{monthName(bill.month)}</td><td>{bill.year || '-'}</td><td>{bill.title || 'Maintenance Bill'}</td><td>{money(bill.amount)}</td><td>{money(bill.penalty_amount)}</td><td>{money(bill.total_amount)}</td><td>{money(bill.paid_amount)}</td><td>{money(bill.remaining_amount)}</td><td>{fullDate(bill.due_date)}</td><td>{fullDate(bill.payment_date)}</td><td><span className={`portal-status ${statusKey(bill.status).replace(' ', '_')}`}>{bill.status}</span></td></tr>)}</tbody>
          </table>
          )}
          {!loading && !myBills.length && <div className="portal-empty">No report data found.</div>}
        </div>
      </section>

      <div className="portal-dashboard-grid">
        <section className="portal-panel portal-table-card">
          <div className="portal-panel-head"><div><h2>Expenses Report</h2><p>Society expenses are read-only for residents.</p></div></div>
          <div className="portal-table-wrap">
            {loading ? <TableSkeleton rows={5} columns={5} /> : (
            <table className="portal-data-table">
              <thead><tr><th>Expense Title</th><th>Category</th><th>Amount</th><th>Date</th><th>Description</th></tr></thead>
              <tbody>{expenses.map((expense) => <tr key={expense.id}><td><strong>{expense.expense_title || expense.expense_number}</strong></td><td>{expense.category}</td><td>{money(expense.amount)}</td><td>{fullDate(expense.date)}</td><td>{expense.description || <span className="portal-muted-text">No description</span>}</td></tr>)}</tbody>
            </table>
            )}
            {!loading && !expenses.length && <div className="portal-empty">No report data found.</div>}
          </div>
        </section>

        <section className="portal-panel">
          <div className="portal-panel-head"><div><h2>Complaint Statistics</h2><p>Status split for your complaints.</p></div></div>
          {loading ? <CardSkeleton count={3} /> : <div className="portal-status-summary">
            <div><span>Pending</span><strong>{reports.pendingComplaints}</strong></div>
            <div><span>In Progress</span><strong>{reports.inProgressComplaints}</strong></div>
            <div><span>Resolved</span><strong>{reports.resolvedComplaints}</strong></div>
          </div>}
        </section>
      </div>
    </div>
  );
};

export default ResidentReports;
