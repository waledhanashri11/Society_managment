import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileBarChart,
  FileSpreadsheet,
  IndianRupee,
  MessageSquareWarning,
  RefreshCw,
  WalletCards
} from 'lucide-react';

import { complaintAPI, maintenanceAPI, flatTypeAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const fullDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '-';
const monthName = (month) =>
  month
    ? new Date(2026, Number(month) - 1).toLocaleDateString('en-IN', {
        month: 'short'
      })
    : '-';

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const statusKey = (status) => String(status || '').toLowerCase();
const isPaid = (status) => statusKey(status) === 'paid';
const isOpen = (status) => !isPaid(status) && statusKey(status) !== 'no bill';

const Reports = () => {
  const currentYear = new Date().getFullYear();

  const [filters, setFilters] = useState({
    month: '',
    year: String(currentYear),
    status: '',
    flat_type: ''
  });
  const [flatTypes, setFlatTypes] = useState([]);

  const [bills, setBills] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [billsRes, complaintsRes, expensesRes, flatTypesRes] = await Promise.all([
        maintenanceAPI.getBills({ force: true }),
        complaintAPI.getAll({ force: true }),
        maintenanceAPI.getExpenses({ force: true }),
        flatTypeAPI.getAll({ force: true })
      ]);

      setBills(unwrap(billsRes));
      setComplaints(unwrap(complaintsRes));
      setExpenses(unwrap(expensesRes));
      setFlatTypes(unwrap(flatTypesRes));
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(
        err.response?.data?.message ||
          'Could not load reports. Please make sure backend and database are running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateFilter = (event) => {
    setFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const matchesMonthYear = useCallback((value, fallbackMonth, fallbackYear) => {
    const date = value ? new Date(value) : null;

    const hasValidDate = date && !Number.isNaN(date.getTime());

    const rowMonth = hasValidDate
      ? date.getMonth() + 1
      : Number(fallbackMonth || 0);

    const rowYear = hasValidDate
      ? date.getFullYear()
      : Number(fallbackYear || 0);

    if (filters.month && Number(filters.month) !== rowMonth) return false;
    if (filters.year && Number(filters.year) !== rowYear) return false;

    return true;
  }, [filters.month, filters.year]);

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      if (
        !matchesMonthYear(
          bill.due_date || bill.payment_date,
          bill.month,
          bill.year
        )
      ) {
        return false;
      }

      if (
        filters.status &&
        statusKey(bill.payment_status || bill.status) !==
          statusKey(filters.status)
      ) {
        return false;
      }

      if (
        filters.flat_type &&
        (bill.flat_type_name || 'Not Assigned').toLowerCase() !== filters.flat_type.toLowerCase()
      ) {
        return false;
      }

      return true;
    });
  }, [bills, filters.status, filters.flat_type, matchesMonthYear]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) =>
      matchesMonthYear(complaint.created_at)
    );
  }, [complaints, matchesMonthYear]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) =>
      matchesMonthYear(expense.expense_date || expense.date)
    );
  }, [expenses, matchesMonthYear]);

  const reports = useMemo(() => {

    const totalCollection = filteredBills
      .filter((bill) => isPaid(bill.payment_status || bill.status))
      .reduce(
        (sum, bill) =>
          sum + Number(bill.paid_amount || bill.total_amount || bill.amount || 0),
        0
      );

    const pendingDues = filteredBills
      .filter((bill) => isOpen(bill.payment_status || bill.status))
      .reduce(
        (sum, bill) =>
          sum +
          Number(bill.remaining_amount || bill.total_amount || bill.amount || 0),
        0
      );

    const totalBillable = filteredBills.reduce(
      (sum, bill) => sum + Number(bill.total_amount || bill.amount || 0),
      0
    );

    const totalExpenses = filteredExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    const resolvedComplaints = filteredComplaints.filter(
      (item) => item.status === 'resolved'
    ).length;

    const pendingComplaints = filteredComplaints.filter(
      (item) => item.status === 'pending'
    ).length;

    const inProgressComplaints = filteredComplaints.filter(
      (item) => item.status === 'in_progress'
    ).length;

    return {
      totalCollection,
      pendingDues,
      totalExpenses,
      netBalance: totalCollection - totalExpenses,
      collectionRate:
        totalBillable > 0
          ? Math.round((totalCollection / totalBillable) * 100)
          : 0,
      totalComplaints: filteredComplaints.length,
      resolvedComplaints,
      pendingComplaints,
      inProgressComplaints,
      totalBills: filteredBills.length,

      paidBills: filteredBills.filter((bill) =>
        isPaid(bill.payment_status || bill.status)
      ).length,
      pendingBills: filteredBills.filter((bill) =>
        isOpen(bill.payment_status || bill.status)
      ).length,
      overdueBills: filteredBills.filter(
        (bill) =>
          isOpen(bill.payment_status || bill.status) &&
          bill.due_date &&
          new Date(bill.due_date) < new Date()
      ).length
    };
  }, [filteredBills, filteredComplaints, filteredExpenses]);

  const downloadCsv = () => {
    const rows = [
      ['Admin Reports'],
      ['Total Collection', reports.totalCollection],
      ['Pending Dues', reports.pendingDues],
      ['Total Expenses', reports.totalExpenses],
      ['Net Balance', reports.netBalance],
      [],
      ['Maintenance Bills'],
      [
        'Resident',
        'Flat',
        'Flat Type',
        'Month',
        'Year',
        'Title',
        'Base Amount',
        'Penalty',
        'Total Amount',
        'Paid Amount',
        'Remaining Amount',
        'Due Date',
        'Payment Date',
        'Status'
      ],
      ...filteredBills.map((bill) => [
        bill.resident_name,
        bill.flat_no,
        bill.flat_type_name || 'Not Assigned',
        monthName(bill.month),
        bill.year,
        bill.title,
        bill.amount,
        bill.penalty_amount,
        bill.total_amount,
        bill.paid_amount,
        bill.remaining_amount,
        fullDate(bill.due_date),
        fullDate(bill.payment_date),
        bill.payment_status || bill.status
      ]),
      [],
      ['Expenses'],
      ['Expense Title', 'Category', 'Amount', 'Date', 'Description'],
      ...filteredExpenses.map((expense) => [
        expense.vendor || expense.expense_title || expense.expense_number,
        expense.category,
        expense.amount,
        fullDate(expense.expense_date || expense.date),
        expense.description
      ]),
      [],
      ['Complaints'],
      ['Resident', 'Title', 'Status', 'Date'],
      ...filteredComplaints.map((complaint) => [
        complaint.user_name || complaint.resident_name,
        complaint.title,
        complaint.status,
        fullDate(complaint.created_at)
      ])
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = `admin-reports-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(link.href);
  };

  const downloadPdf = () => {
    const html = `
      <html>
        <head>
          <title>Admin Reports</title>
          <style>
            body{font-family:Arial,sans-serif;padding:28px;color:#172033}
            h1{margin:0 0 12px}
            table{width:100%;border-collapse:collapse;margin:18px 0 28px;font-size:11px}
            th,td{border:1px solid #dfe5ee;padding:7px;text-align:left}
            th{background:#f3f6fa}
            .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
            .card{border:1px solid #dfe5ee;border-radius:8px;padding:10px}
            .card span{display:block;color:#667085;font-size:11px}
            .card strong{font-size:16px}
          </style>
        </head>
        <body>
          <h1>Admin Reports</h1>

          <div class="cards">
            <div class="card"><span>Total Collection</span><strong>${money(
              reports.totalCollection
            )}</strong></div>
            <div class="card"><span>Pending Dues</span><strong>${money(
              reports.pendingDues
            )}</strong></div>
            <div class="card"><span>Expenses</span><strong>${money(
              reports.totalExpenses
            )}</strong></div>
            <div class="card"><span>Net Balance</span><strong>${money(
              reports.netBalance
            )}</strong></div>
          </div>

          <h2>Maintenance Bills</h2>
          <table>
            <thead>
              <tr>
                <th>Resident</th>
                <th>Flat</th>
                <th>Flat Type</th>
                <th>Month</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBills
                .map(
                  (bill) => `
                    <tr>
                      <td>${bill.resident_name || ''}</td>
                      <td>${bill.flat_no || ''}</td>
                      <td>${bill.flat_type_name || 'Not Assigned'}</td>
                      <td>${monthName(bill.month)} ${bill.year || ''}</td>
                      <td>${money(bill.total_amount)}</td>
                      <td>${money(bill.paid_amount)}</td>
                      <td>${money(bill.remaining_amount)}</td>
                      <td>${bill.payment_status || bill.status || ''}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>

          <h2>Expenses</h2>
          <table>
            <thead>
              <tr>
                <th>Expense</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${filteredExpenses
                .map(
                  (expense) => `
                    <tr>
                      <td>${expense.vendor || expense.expense_title || ''}</td>
                      <td>${expense.category || ''}</td>
                      <td>${money(expense.amount)}</td>
                      <td>${fullDate(expense.expense_date || expense.date)}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>

          <script>window.print();</script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=750');

    if (!printWindow) return;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="portal-module">
        <div className="portal-page-title">
          <div>
            <h1>Reports & Analytics</h1>
            <p>Admin-wide financial, expense and complaint reports.</p>
          </div>
        </div>

        <CardSkeleton count={4} />

        <section className="portal-panel portal-table-card">
          <TableSkeleton rows={5} columns={4} />
        </section>
      </div>
    );
  }

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div>
          <h1>Reports & Analytics</h1>
          <p>Admin-wide financial, expense and complaint reports.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="portal-light-btn" onClick={downloadPdf}>
            <Download size={15} /> PDF
          </button>
          <button className="portal-light-btn" onClick={downloadCsv}>
            <FileSpreadsheet size={15} /> CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5">
        <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
          Month
          <select
            name="month"
            value={filters.month}
            onChange={updateFilter}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900"
          >
            <option value="">All</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {monthName(i + 1)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
          Year
          <input
            name="year"
            type="number"
            value={filters.year}
            onChange={updateFilter}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
          />
        </label>

        <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
          Status
          <select
            name="status"
            value={filters.status}
            onChange={updateFilter}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900"
          >
            <option value="">All</option>
            <option>Pending</option>
            <option>Under Review</option>
            <option>Paid</option>
            <option>Overdue</option>
            <option>Partial</option>
          </select>
        </label>

        <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
          Flat Type
          <select
            name="flat_type"
            value={filters.flat_type}
            onChange={updateFilter}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900"
          >
            <option value="">All</option>
            <option value="Not Assigned">Not Assigned</option>
            {flatTypes.map((ft) => (
              <option key={ft.id} value={ft.name}>
                {ft.name}
              </option>
            ))}
          </select>
        </label>

        <button className="portal-primary-btn self-end" onClick={load}>
          <RefreshCw size={15} /> Refresh Data
        </button>
      </div>

      <div className="portal-kpis">
        <div className="portal-kpi green">
          <span>Total Collection</span>
          <strong>{money(reports.totalCollection)}</strong>
          <small>{reports.paidBills} paid bills</small>
          <div className="portal-kpi-icon">
            <IndianRupee size={18} />
          </div>
        </div>

        <div className="portal-kpi orange">
          <span>Pending Dues</span>
          <strong>{money(reports.pendingDues)}</strong>
          <small>{reports.pendingBills} bills awaiting payment</small>
          <div className="portal-kpi-icon">
            <WalletCards size={18} />
          </div>
        </div>

        <div className="portal-kpi red">
          <span>Total Expenses</span>
          <strong>{money(reports.totalExpenses)}</strong>
          <small>Society spending</small>
          <div className="portal-kpi-icon">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="portal-kpi green">
          <span>Net Balance</span>
          <strong>{money(reports.netBalance)}</strong>
          <small>{reports.collectionRate}% collection rate</small>
          <div className="portal-kpi-icon">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="portal-kpi">
          <span>Total Complaints</span>
          <strong>{reports.totalComplaints}</strong>
          <small>All resident requests</small>
          <div className="portal-kpi-icon">
            <MessageSquareWarning size={18} />
          </div>
        </div>

        <div className="portal-kpi green">
          <span>Resolved</span>
          <strong>{reports.resolvedComplaints}</strong>
          <small>Completed complaints</small>
          <div className="portal-kpi-icon">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      <section className="portal-panel mb-4">
        <div className="portal-panel-head">
          <div>
            <h2>Society Annual Report</h2>
            <p>Collection, expenses and bill status summary.</p>
          </div>
          <FileBarChart size={16} />
        </div>

        <div className="settings-status-grid">
          <div>
            <span>Total Society Collection</span>
            <strong>{money(reports.totalCollection)}</strong>
          </div>
          <div>
            <span>Total Society Expenses</span>
            <strong>{money(reports.totalExpenses)}</strong>
          </div>
          <div>
            <span>Net Balance</span>
            <strong>{money(reports.netBalance)}</strong>
          </div>
          <div>
            <span>Collection Rate</span>
            <strong>{reports.collectionRate}%</strong>
          </div>
          <div>
            <span>Paid Bills Count</span>
            <strong>{reports.paidBills}</strong>
          </div>
          <div>
            <span>Pending Bills Count</span>
            <strong>{reports.pendingBills}</strong>
          </div>
          <div>
            <span>Overdue Bills Count</span>
            <strong>{reports.overdueBills}</strong>
          </div>
        </div>
      </section>

      <section className="portal-panel portal-table-card mb-4">
        <div className="portal-panel-head">
          <div>
            <h2>Maintenance Report</h2>
            <p>All resident maintenance bills.</p>
          </div>
        </div>

        <div className="portal-table-wrap">
          <table className="portal-data-table">
            <thead>
              <tr>
                <th>Resident</th>
                <th>Flat</th>
                <th>Flat Type</th>
                <th>Month</th>
                <th>Year</th>
                <th>Title</th>
                <th>Base Amount</th>
                <th>Penalty</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Due Date</th>
                <th>Payment Date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredBills.map((bill) => (
                <tr key={bill.id}>
                  <td>
                    <strong>{bill.resident_name || '-'}</strong>
                  </td>
                  <td>{bill.flat_no || '-'}</td>
                  <td>
                    <span style={{ fontWeight: '500', color: bill.flat_type_name ? '#1e293b' : '#94a3b8' }}>
                      {bill.flat_type_name || 'Not Assigned'}
                    </span>
                  </td>
                  <td>{monthName(bill.month)}</td>
                  <td>{bill.year || '-'}</td>
                  <td>{bill.title || 'Maintenance Bill'}</td>
                  <td>{money(bill.amount)}</td>
                  <td>{money(bill.penalty_amount)}</td>
                  <td>{money(bill.total_amount)}</td>
                  <td>{money(bill.paid_amount)}</td>
                  <td>{money(bill.remaining_amount)}</td>
                  <td>{fullDate(bill.due_date)}</td>
                  <td>{fullDate(bill.payment_date)}</td>
                  <td>
                    <span
                      className={`portal-status ${statusKey(
                        bill.payment_status || bill.status
                      ).replace(' ', '_')}`}
                    >
                      {bill.payment_status || bill.status || '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filteredBills.length && (
            <div className="portal-empty">No report data found.</div>
          )}
        </div>
      </section>

      <div className="portal-dashboard-grid">
        <section className="portal-panel portal-table-card">
          <div className="portal-panel-head">
            <div>
              <h2>Expenses Report</h2>
              <p>Society expense records.</p>
            </div>
          </div>

          <div className="portal-table-wrap">
            <table className="portal-data-table">
              <thead>
                <tr>
                  <th>Expense Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Description</th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <strong>
                        {expense.vendor ||
                          expense.expense_title ||
                          expense.expense_number ||
                          '-'}
                      </strong>
                    </td>
                    <td>{expense.category || '-'}</td>
                    <td>{money(expense.amount)}</td>
                    <td>{fullDate(expense.expense_date || expense.date)}</td>
                    <td>
                      {expense.description || (
                        <span className="portal-muted-text">No description</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filteredExpenses.length && (
              <div className="portal-empty">No report data found.</div>
            )}
          </div>
        </section>

        <section className="portal-panel">
          <div className="portal-panel-head">
            <div>
              <h2>Complaint Statistics</h2>
              <p>Status split for all complaints.</p>
            </div>
          </div>

          <div className="portal-status-summary">
            <div>
              <span>Pending</span>
              <strong>{reports.pendingComplaints}</strong>
            </div>
            <div>
              <span>In Progress</span>
              <strong>{reports.inProgressComplaints}</strong>
            </div>
            <div>
              <span>Resolved</span>
              <strong>{reports.resolvedComplaints}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Reports;
