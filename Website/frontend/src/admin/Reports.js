import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileBarChart,
  FileSpreadsheet,
  IndianRupee,
  RefreshCw,
  WalletCards
} from 'lucide-react';

import { maintenanceAPI, flatTypeAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const money = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;
const fullDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '—';
const monthName = (month) =>
  month
    ? new Date(2026, Number(month) - 1).toLocaleDateString('en-IN', {
        month: 'short'
      })
    : '—';

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const statusKey = (status) => String(status || '').toLowerCase().trim();

const getOperationalStatus = (bill) => {
  const remaining = Number(
    bill.remaining_amount !== null && bill.remaining_amount !== undefined
      ? bill.remaining_amount
      : bill.total_amount || 0
  );
  if (remaining <= 0) return 'Paid';
  const isOverdue = bill.due_date && new Date(bill.due_date) < new Date();
  return isOverdue ? 'Overdue' : 'Pending';
};

const Reports = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const [filters, setFilters] = useState({
    month: '',
    year: String(currentYear),
    status: '',
    flat_type: ''
  });
  const [flatTypes, setFlatTypes] = useState([]);

  const [bills, setBills] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [billsRes, expensesRes, flatTypesRes] = await Promise.all([
        maintenanceAPI.getBills({ force: true }),
        maintenanceAPI.getExpenses({ force: true }),
        flatTypeAPI.getAll({ force: true })
      ]);

      setBills(unwrap(billsRes));
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
        statusKey(getOperationalStatus(bill)) !== statusKey(filters.status)
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

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) =>
      matchesMonthYear(expense.expense_date || expense.date)
    );
  }, [expenses, matchesMonthYear]);

  const reports = useMemo(() => {
    const totalBillable = filteredBills.reduce(
      (sum, bill) => sum + Number(bill.total_amount || bill.amount || 0),
      0
    );

    const totalCollection = filteredBills.reduce(
      (sum, bill) => sum + Number(bill.paid_amount || 0) + Number(bill.write_off_amount || 0),
      0
    );

    const actualAmountCollected = filteredBills.reduce(
      (sum, bill) => sum + Number(bill.paid_amount || 0),
      0
    );

    const pendingDues = filteredBills.reduce(
      (sum, bill) =>
        sum +
        Number(
          bill.remaining_amount !== null && bill.remaining_amount !== undefined
            ? bill.remaining_amount
            : bill.total_amount || 0
        ),
      0
    );

    const totalExpenses = filteredExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    const paidBills = filteredBills.filter(
      (bill) => getOperationalStatus(bill) === 'Paid'
    ).length;

    const pendingBills = filteredBills.filter(
      (bill) => getOperationalStatus(bill) === 'Pending'
    ).length;

    const overdueBills = filteredBills.filter(
      (bill) => getOperationalStatus(bill) === 'Overdue'
    ).length;

    const totalWriteOff = filteredBills.reduce(
      (sum, bill) => sum + Number(bill.write_off_amount || 0),
      0
    );

    return {
      totalCollection,
      actualAmountCollected,
      pendingDues,
      totalExpenses,
      totalWriteOff,
      netBalance: totalCollection - totalExpenses,
      collectionRate:
        totalBillable > 0
          ? Math.round((totalCollection / totalBillable) * 100)
          : 0,
      totalBills: filteredBills.length,
      paidBills,
      pendingBills,
      overdueBills
    };
  }, [filteredBills, filteredExpenses]);

  const downloadCsv = () => {
    const rows = [
      ['Admin Operational Financial Reports'],
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
        getOperationalStatus(bill)
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
          <title>Admin Operational Financial Reports</title>
          <style>
            body{font-family:Arial,sans-serif;padding:28px;color:#172033}
            h1{margin:0 0 12px}
            table{width:100%;border-collapse:collapse;margin:18px 0 28px;font-size:11px}
            th,td{border:1px solid #dfe5ee;padding:7px;text-align:left}
            th{background:#f3f6fa}
          </style>
        </head>
        <body>
          <h1>Admin Operational Financial Reports</h1>
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
                      <td>${getOperationalStatus(bill)}</td>
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
            <h1>{t('reports.title', 'Financial Reports')}</h1>
            <p>{t('reports.subtitle', 'Society operational financial analytics and reports.')}</p>
          </div>
        </div>

        {CardSkeleton ? <CardSkeleton count={4} /> : null}

        <section className="portal-panel portal-table-card">
          {TableSkeleton ? <TableSkeleton rows={5} columns={4} /> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div>
          <h1>{t('reports.title', 'Financial Reports')}</h1>
          <p>{t('reports.subtitle', 'Society operational financial analytics and reports.')}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="portal-light-btn" onClick={downloadPdf}>
            {Download ? <Download size={14} /> : null} {t('reports.pdf', 'PDF')}
          </button>
          <button className="portal-light-btn" onClick={downloadCsv}>
            {FileSpreadsheet ? <FileSpreadsheet size={14} /> : null} {t('reports.csv', 'CSV')}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '14px', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '13px', fontWeight: 'bold' }}>
          {error}
        </div>
      )}

      {/* Filter Bar Panel */}
      <div className="portal-panel" style={{ padding: '14px 18px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>
            {t('reports.month', 'MONTH')}
            <select
              name="month"
              value={filters.month}
              onChange={updateFilter}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
            >
              <option value="">{t('reports.all', 'All')}</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {monthName(i + 1)}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>
            {t('reports.year', 'YEAR')}
            <input
              name="year"
              type="number"
              value={filters.year}
              onChange={updateFilter}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>
            {t('reports.status', 'STATUS')}
            <select
              name="status"
              value={filters.status}
              onChange={updateFilter}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
            >
              <option value="">{t('reports.all', 'All')}</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>
            {t('reports.flatType', 'FLAT TYPE')}
            <select
              name="flat_type"
              value={filters.flat_type}
              onChange={updateFilter}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
            >
              <option value="">{t('reports.all', 'All')}</option>
              <option value="Not Assigned">{t('reports.notAssigned', 'Not Assigned')}</option>
              {flatTypes.map((ft) => (
                <option key={ft.id} value={ft.name}>
                  {ft.name}
                </option>
              ))}
            </select>
          </label>

          <button className="portal-primary-btn" onClick={load} style={{ padding: '7px 14px', fontSize: '11px' }}>
            {RefreshCw ? <RefreshCw size={14} /> : null} {t('reports.refreshData', 'Refresh Data')}
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="portal-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="portal-kpi green">
          <span>{t('reports.totalCollection', 'Total Collection')}</span>
          <strong>{money(reports.totalCollection)}</strong>
          <small>{t('reports.revenueCollected', 'Revenue collected')}</small>
          <div className="portal-kpi-icon">{IndianRupee ? <IndianRupee size={16} /> : null}</div>
        </div>

        <div className="portal-kpi orange">
          <span>{t('reports.pendingDues', 'Pending Dues')}</span>
          <strong>{money(reports.pendingDues)}</strong>
          <small>{t('reports.outstandingBalance', 'Outstanding balance')}</small>
          <div className="portal-kpi-icon">{WalletCards ? <WalletCards size={16} /> : null}</div>
        </div>

        <div className="portal-kpi red">
          <span>{t('reports.totalExpenses', 'Total Expenses')}</span>
          <strong>{money(reports.totalExpenses)}</strong>
          <small>{t('reports.societyExpenditures', 'Society expenditures')}</small>
          <div className="portal-kpi-icon">{AlertTriangle ? <AlertTriangle size={16} /> : null}</div>
        </div>

        <div className="portal-kpi green">
          <span>{t('reports.netBalance', 'Net Balance')}</span>
          <strong>{money(reports.netBalance)}</strong>
          <small>{t('reports.collectionVsExpenses', 'Collection vs expenses')}</small>
          <div className="portal-kpi-icon">{CheckCircle2 ? <CheckCircle2 size={16} /> : null}</div>
        </div>
      </div>

      {/* Maintenance Report Panel */}
      <section className="portal-panel portal-table-card mb-4" style={{ marginBottom: '16px' }}>
        <div className="portal-panel-head">
          <div>
            <h2>{t('reports.maintenanceReport', 'Maintenance Report')}</h2>
            <p>{t('reports.allResidentBills', 'All resident maintenance bills.')}</p>
          </div>
          <span className="portal-date-chip" style={{ fontSize: '10px' }}>{filteredBills.length} Bills</span>
        </div>

        <div className="portal-table-wrap">
          <table className="portal-data-table">
            <thead>
              <tr>
                <th>{t('reports.resident', 'Resident')}</th>
                <th>{t('reports.flat', 'Flat')}</th>
                <th>{t('reports.flatType', 'Flat Type')}</th>
                <th>{t('reports.month_col', 'Month')}</th>
                <th>{t('reports.year', 'Year')}</th>
                <th>{t('reports.originalBill', 'Original Bill')}</th>
                <th>{t('reports.paidAmount', 'Paid Amount')}</th>
                <th>{t('reports.writeOff', 'Write Off')}</th>
                <th>{t('reports.remaining', 'Remaining')}</th>
                <th>{t('reports.dueDate', 'Due Date')}</th>
                <th>{t('reports.status', 'Status')}</th>
              </tr>
            </thead>

            <tbody>
              {filteredBills.map((bill) => {
                const opStatus = getOperationalStatus(bill);
                return (
                  <tr key={bill.id}>
                    <td>
                      <strong>{bill.resident_name || 'Resident'}</strong>
                    </td>
                    <td>{bill.flat_no || '-'}</td>
                    <td>
                      <span style={{ fontWeight: '500', color: bill.flat_type_name ? '#1e293b' : '#94a3b8' }}>
                        {bill.flat_type_name || t('reports.notAssigned', 'Not Assigned')}
                      </span>
                    </td>
                    <td>{monthName(bill.month)}</td>
                    <td>{bill.year || '-'}</td>
                    <td>{money(bill.total_amount)}</td>
                    <td>{money(bill.paid_amount)}</td>
                    <td style={{ color: Number(bill.write_off_amount) > 0 ? '#b91c1c' : 'inherit', fontWeight: Number(bill.write_off_amount) > 0 ? '700' : 'normal' }}>
                      {money(bill.write_off_amount)}
                    </td>
                    <td>{money(bill.remaining_amount)}</td>
                    <td>{fullDate(bill.due_date)}</td>
                    <td>
                      <span className={`portal-status ${opStatus === 'Paid' ? 'resolved' : opStatus === 'Overdue' ? 'rejected' : 'pending'}`}>
                        {opStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!filteredBills.length && (
            <div className="portal-empty">{t('reports.noReportData', 'No report data found.')}</div>
          )}
        </div>
      </section>

      {/* Expenses Report Panel */}
      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head">
          <div>
            <h2>{t('reports.expensesReport', 'Expenses Report')}</h2>
            <p>{t('reports.societyExpenseRecords', 'Society expense records.')}</p>
          </div>
          <span className="portal-date-chip" style={{ fontSize: '10px' }}>{filteredExpenses.length} Expenses</span>
        </div>

        <div className="portal-table-wrap">
          <table className="portal-data-table">
            <thead>
              <tr>
                <th>{t('reports.expenseTitle', 'Expense Title')}</th>
                <th>{t('reports.category', 'Category')}</th>
                <th>{t('reports.amount', 'Amount')}</th>
                <th>{t('reports.date', 'Date')}</th>
                <th>{t('reports.description', 'Description')}</th>
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
                        'Expense'}
                    </strong>
                  </td>
                  <td>{expense.category || '-'}</td>
                  <td><strong>{money(expense.amount)}</strong></td>
                  <td>{fullDate(expense.expense_date || expense.date)}</td>
                  <td>
                    {expense.description || (
                      <span className="portal-muted-text">{t('reports.noDescription', 'No description')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filteredExpenses.length && (
            <div className="portal-empty">{t('reports.noReportData', 'No report data found.')}</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Reports;
