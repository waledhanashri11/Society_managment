import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Bell, CalendarDays,
  CheckCircle2, ChevronDown, CircleDollarSign, Download, FileBarChart, FileText,
  Filter, IndianRupee, LayoutDashboard, MoreHorizontal, Plus, ReceiptIndianRupee,
  RefreshCcw, Search, SlidersHorizontal, TrendingUp, Wallet,
  X
} from 'lucide-react';
import { maintenanceAPI } from '../services/api';
import './maintenance.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const unwrap = (response, fallback = []) => response?.data?.data ?? response?.data ?? fallback;
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const initialStats = {
  collected: 0, pending: 0, overdue: 0, collectionPercentage: 0,
  residents: 0, monthIncome: 0, monthExpense: 0, outstanding: 0
};

const statusClass = (status = '') => {
  const key = status.toLowerCase().replace(/\s/g, '-');
  return `mm-status mm-status-${key}`;
};

function Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div className="mm-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className={`mm-modal ${wide ? 'mm-modal-wide' : ''}`} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mm-modal-head">
          <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          <button className="mm-icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Empty({ title, copy }) {
  return <div className="mm-empty"><ReceiptIndianRupee size={30} /><strong>{title}</strong><span>{copy}</span></div>;
}

function MiniChart({ data }) {
  const values = data.length ? data : shortMonths.slice(0, 6).map((month) => ({ month, collected: 0, pending: 0 }));
  const max = Math.max(...values.map((item) => Number(item.collected || 0) + Number(item.pending || 0)), 1);
  return (
    <div className="mm-bar-chart">
      <div className="mm-chart-scale">
        <span>{money(max)}</span>
        <span>{money(max / 2)}</span>
        <span>₹0</span>
      </div>
      {values.map((item, index) => (
        <div className="mm-bar-column" key={`${item.month}-${index}`}>
          <div className="mm-bar-stack" title={`${item.month}: collected ${money(item.collected)}, outstanding ${money(item.pending)}`}>
            <span className="mm-bar-pending" style={{ height: `${Number(item.pending) > 0 ? Math.max(5, Number(item.pending) / max * 150) : 0}px` }} />
            <span className="mm-bar-paid" style={{ height: `${Number(item.collected) > 0 ? Math.max(5, Number(item.collected) / max * 150) : 0}px` }} />
          </div>
          <small>{item.month}</small>
        </div>
      ))}
    </div>
  );
}

const Maintenance = () => {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [cycles, setCycles] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [dashboard, setDashboard] = useState({ summary: initialStats, trend: [], expenseDistribution: [], overdueFlats: [] });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const current = new Date();
  const [cycleForm, setCycleForm] = useState({ title: `${months[current.getMonth()]} Maintenance`, month: current.getMonth() + 1, year: current.getFullYear(), dueDate: '', description: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', amount: '', calculationType: 'FIXED', active: true });
  const [expenseForm, setExpenseForm] = useState({ category: 'Repairs', vendor: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: 'Bank Transfer', status: 'Paid', description: '' });

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    const requests = [
      maintenanceAPI.getAll(), maintenanceAPI.getBills(), maintenanceAPI.getDashboard(),
      maintenanceAPI.getCategories(), maintenanceAPI.getExpenses(), maintenanceAPI.getPayments()
    ];
    const results = await Promise.allSettled(requests);
    if (results[0].status === 'fulfilled') setCycles(unwrap(results[0].value));
    if (results[1].status === 'fulfilled') setBills(unwrap(results[1].value));
    if (results[2].status === 'fulfilled') setDashboard(unwrap(results[2].value, dashboard));
    if (results[3].status === 'fulfilled') setCategories(unwrap(results[3].value));
    if (results[4].status === 'fulfilled') setExpenses(unwrap(results[4].value));
    if (results[5].status === 'fulfilled') setPayments(unwrap(results[5].value));
    if (results.every((result) => result.status === 'rejected')) setError('The maintenance service is unavailable. Start the backend and refresh this page.');
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const calculatedStats = useMemo(() => {
    if (Number(dashboard.summary?.collected) || Number(dashboard.summary?.pending)) return dashboard.summary;
    const collected = bills.reduce((sum, bill) => sum + (bill.payment_status === 'Paid' ? Number(bill.total_amount) : 0), 0);
    const pending = bills.reduce((sum, bill) => sum + (bill.payment_status !== 'Paid' ? Number(bill.total_amount) : 0), 0);
    const overdue = bills.reduce((sum, bill) => sum + (bill.payment_status !== 'Paid' && new Date(bill.due_date) < new Date() ? Number(bill.total_amount) : 0), 0);
    const paid = bills.filter((bill) => bill.payment_status === 'Paid').length;
    return { ...initialStats, collected, pending, overdue, outstanding: pending, collectionPercentage: bills.length ? Math.round(paid / bills.length * 100) : 0 };
  }, [bills, dashboard.summary]);

  const filteredBills = useMemo(() => bills.filter((bill) => {
    const text = `${bill.bill_number || ''} ${bill.invoice_number || ''} ${bill.resident_name || ''} ${bill.flat_no || ''}`.toLowerCase();
    const matchesStatus = status === 'All' || bill.payment_status === status || (status === 'Overdue' && bill.payment_status !== 'Paid' && new Date(bill.due_date) < new Date());
    const matchesMonth = monthFilter === 'All' || Number(bill.month) === Number(monthFilter);
    const matchesYear = yearFilter === 'All' || Number(bill.year) === Number(yearFilter);
    return text.includes(query.toLowerCase()) && matchesStatus && matchesMonth && matchesYear;
  }), [bills, query, status, monthFilter, yearFilter]);

  const yearOptions = useMemo(() => {
    const years = [...new Set(bills.map((bill) => Number(bill.year)).filter(Boolean))].sort((a, b) => b - a);
    return years.length ? years : [new Date().getFullYear()];
  }, [bills]);

  const chartData = useMemo(() => {
    const now = new Date();
    const timeline = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return {
        key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        month: shortMonths[monthDate.getMonth()],
        collected: 0,
        pending: 0
      };
    });
    const byKey = new Map(timeline.map((item) => [item.key, item]));

    if (bills.length) {
      bills.forEach((bill) => {
        const monthNumber = Number(bill.month);
        const yearNumber = Number(bill.year);
        let key = '';
        if (monthNumber && yearNumber) {
          key = `${yearNumber}-${String(monthNumber).padStart(2, '0')}`;
        } else {
          const billDate = new Date(bill.due_date || bill.payment_date || bill.created_at || Date.now());
          key = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
        }
        const bucket = byKey.get(key);
        if (!bucket) return;
        if (bill.payment_status === 'Paid') bucket.collected += Number(bill.paid_amount || bill.total_amount || bill.amount || 0);
        else bucket.pending += Number(bill.remaining_amount || bill.total_amount || bill.amount || 0);
      });
      return timeline;
    }

    (dashboard.trend || []).forEach((item) => {
      const monthIndex = shortMonths.findIndex((month) => month.toLowerCase() === String(item.month).slice(0, 3).toLowerCase());
      if (monthIndex < 0) return;
      const bucket = timeline.find((value) => value.month === shortMonths[monthIndex]);
      if (!bucket) return;
      bucket.collected = Number(item.collected || 0);
      bucket.pending = Number(item.pending || 0);
    });

    return timeline;
  }, [bills, dashboard.trend]);

  const csvEscape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const downloadCsv = (filename, rows) => {
    if (!rows.length) {
      notify('No data available to export');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify('CSV file downloaded');
  };

  const billRows = (items = filteredBills) => items.map((bill) => ({
    bill_number: bill.bill_number || `BILL-${String(bill.id).padStart(5, '0')}`,
    invoice_number: bill.invoice_number || `INV-${bill.id}`,
    resident: bill.resident_name || '',
    flat: bill.flat_no || '',
    month: months[(Number(bill.month) || 1) - 1],
    year: bill.year || '',
    due_date: date(bill.due_date),
    total_amount: Number(bill.total_amount || 0),
    paid_amount: Number(bill.paid_amount || 0),
    remaining_amount: Number(bill.remaining_amount || 0),
    late_fee: Number(bill.late_fee || 0),
    status: bill.payment_status || ''
  }));

  const exportCurrentView = () => {
    if (tab === 'bills') return downloadCsv('maintenance-bills.csv', billRows());
    if (tab === 'categories') return downloadCsv('maintenance-categories.csv', categories.map((item) => ({
      name: item.name,
      amount: Number(item.amount || 0),
      calculation_type: item.calculation_type,
      active: item.active ? 'Active' : 'Inactive'
    })));
    if (tab === 'expenses') return downloadCsv('maintenance-expenses.csv', expenses.map((item) => ({
      expense_number: item.expense_number,
      category: item.category,
      vendor: item.vendor,
      date: date(item.expense_date),
      amount: Number(item.amount || 0),
      payment_method: item.payment_method || '',
      status: item.status,
      description: item.description || ''
    })));
    return downloadCsv('maintenance-overview.csv', [
      { metric: 'Total collected', value: calculatedStats.collected },
      { metric: 'Pending payments', value: calculatedStats.pending },
      { metric: 'Overdue amount', value: calculatedStats.overdue },
      { metric: 'Collection rate', value: `${calculatedStats.collectionPercentage || 0}%` },
      { metric: 'Total bills', value: bills.length },
      { metric: 'Total expenses', value: expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0) },
      ...chartData.map((item) => ({ metric: `${item.month} collected`, value: item.collected })),
      ...chartData.map((item) => ({ metric: `${item.month} outstanding`, value: item.pending }))
    ]);
  };

  const exportReport = (type) => {
    if (type === 'Monthly collection') return downloadCsv('monthly-collection.csv', chartData.map((item) => ({ month: item.month, collected: item.collected, outstanding: item.pending })));
    if (type === 'Pending dues') return downloadCsv('pending-dues.csv', billRows(bills.filter((bill) => bill.payment_status !== 'Paid')));
    if (type === 'Expense report') return downloadCsv('expense-report.csv', expenses.map((item) => ({ expense_number: item.expense_number, category: item.category, vendor: item.vendor, amount: Number(item.amount || 0), status: item.status })));
    return exportCurrentView();
  };

  const printDocument = (type, bill) => {
    const html = `
      <html>
        <head>
          <title>${type} - ${bill.bill_number || bill.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #172033; }
            .box { max-width: 760px; margin: 0 auto; border: 1px solid #dfe5ee; border-radius: 14px; padding: 28px; }
            h1 { margin: 0; font-size: 26px; }
            .muted { color: #667085; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            td, th { border-bottom: 1px solid #edf0f3; padding: 12px; text-align: left; }
            .total { font-size: 22px; font-weight: 800; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>${type}</h1>
            <div class="muted">Society Management System</div>
            <table>
              <tr><th>Bill No.</th><td>${bill.bill_number || `BILL-${bill.id}`}</td></tr>
              <tr><th>Invoice No.</th><td>${bill.invoice_number || `INV-${bill.id}`}</td></tr>
              <tr><th>Resident</th><td>${bill.resident_name || 'Resident'}</td></tr>
              <tr><th>Flat</th><td>${bill.flat_no || ''}</td></tr>
              <tr><th>Period</th><td>${months[(Number(bill.month) || 1) - 1]} ${bill.year || ''}</td></tr>
              <tr><th>Due Date</th><td>${date(bill.due_date)}</td></tr>
              <tr><th>Status</th><td>${bill.payment_status || ''}</td></tr>
              <tr><th>Amount</th><td>${money(bill.amount)}</td></tr>
              <tr><th>Late Fee</th><td>${money(bill.late_fee)}</td></tr>
              <tr><th class="total">Total</th><td class="total">${money(bill.total_amount)}</td></tr>
            </table>
            <p class="muted right">Generated on ${new Date().toLocaleString('en-IN')}</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>`;
    const docWindow = window.open('', '_blank', 'width=900,height=700');
    if (!docWindow) {
      notify('Popup blocked. Allow popups to print this document.');
      return;
    }
    docWindow.document.write(html);
    docWindow.document.close();
  };

  const markPaid = async (bill) => {
    const transactionId = window.prompt('Enter transaction/reference ID', `ADMIN-${Date.now()}`);
    if (!transactionId) return;
    try {
      await maintenanceAPI.markBillPaid(bill.id, {
        paymentMethod: 'Manual',
        transactionId,
        remarks: 'Marked paid by admin'
      });
      notify('Bill marked as paid');
      setModal(null);
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not mark bill paid');
    }
  };

  const updatePaymentStatus = async (payment, paymentStatus) => {
    try {
      await maintenanceAPI.updatePayment(payment.id, {
        paymentStatus,
        remarks: paymentStatus === 'Paid' ? 'Approved by admin' : 'Rejected by admin'
      });
      notify(paymentStatus === 'Paid' ? 'Payment approved' : 'Payment rejected');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not update payment');
    }
  };

  const sendReminder = async (bill) => {
    try {
      await maintenanceAPI.sendReminder(bill.id);
      notify('Payment reminder recorded');
    } catch (err) {
      notify(err.response?.data?.message || 'Could not send reminder');
    }
  };

  const submitCycle = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const response = await maintenanceAPI.create(cycleForm);
      const cycleId = response?.data?.data?.id;
      if (modal === 'generate' && cycleId) await maintenanceAPI.generateBills({ maintenanceId: cycleId });
      notify(modal === 'generate' ? 'Monthly bills generated successfully' : 'Maintenance cycle created');
      setModal(null); await load();
    } catch (err) { notify(err.response?.data?.message || 'Could not save maintenance cycle'); }
    finally { setSaving(false); }
  };

  const generateExisting = async (id) => {
    setSaving(true);
    try { await maintenanceAPI.generateBills({ maintenanceId: id }); notify('Bills generated successfully'); setModal(null); await load(); }
    catch (err) { notify(err.response?.data?.message || 'Could not generate bills'); }
    finally { setSaving(false); }
  };

  const submitCategory = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (selected) await maintenanceAPI.updateCategory(selected.id, categoryForm);
      else await maintenanceAPI.createCategory(categoryForm);
      notify(selected ? 'Category updated' : 'Category added'); setModal(null); setSelected(null); await load();
    } catch (err) { notify(err.response?.data?.message || 'Could not save category'); }
    finally { setSaving(false); }
  };

  const submitExpense = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await maintenanceAPI.createExpense(expenseForm); notify('Expense recorded'); setModal(null); await load(); }
    catch (err) { notify(err.response?.data?.message || 'Could not record expense'); }
    finally { setSaving(false); }
  };

  const openEditCategory = (item) => {
    setSelected(item);
    setCategoryForm({ name: item.name, amount: item.amount, calculationType: item.calculation_type, active: Boolean(item.active) });
    setModal('category');
  };

  const statCards = [
    { label: 'Total collected', value: money(calculatedStats.collected), note: '12.4% from last month', icon: IndianRupee, tone: 'blue', up: true },
    { label: 'Pending payments', value: money(calculatedStats.pending), note: `${bills.filter((b) => b.payment_status !== 'Paid').length} bills awaiting`, icon: Wallet, tone: 'amber' },
    { label: 'Overdue amount', value: money(calculatedStats.overdue), note: 'Needs attention', icon: AlertCircle, tone: 'red' },
    { label: 'Collection rate', value: `${calculatedStats.collectionPercentage || 0}%`, note: 'Monthly performance', icon: TrendingUp, tone: 'green', up: true }
  ];

  return (
    <div className="mm-shell">
      {toast && <div className="mm-toast"><CheckCircle2 size={18} />{toast}</div>}
      <div className="mm-page-head">
        <div>
          <div className="mm-eyebrow">Finance & billing</div>
          <h1>Maintenance management</h1>
          <p>Track collections, bills, expenses and resident payments from one place.</p>
        </div>
        <div className="mm-head-actions">
          <button className="mm-button mm-button-light" onClick={exportCurrentView}><Download size={17} /> Export CSV</button>
          <button className="mm-button mm-button-primary" onClick={() => setModal('generate')}><Plus size={18} /> Generate bills</button>
        </div>
      </div>

      <div className="mm-tabs" role="tablist">
        {[
          ['overview', LayoutDashboard, 'Overview'], ['bills', ReceiptIndianRupee, 'Bills'],
          ['categories', SlidersHorizontal, 'Categories'], ['expenses', Wallet, 'Expenses'],
          ['payments', CheckCircle2, 'Payments'], ['reports', FileBarChart, 'Reports']
        ].map(([key, Icon, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon size={17} />{label}</button>
        ))}
      </div>

      {error && <div className="mm-alert"><AlertCircle size={18} /><span>{error}</span><button onClick={load}>Retry</button></div>}

      {loading ? (
        <div className="mm-skeleton-grid">{[1, 2, 3, 4].map((i) => <div key={i} className="mm-skeleton" />)}</div>
      ) : tab === 'overview' ? (
        <>
          <div className="mm-stat-grid">
            {statCards.map(({ label, value, note, icon: Icon, tone, up }) => (
              <article className="mm-stat" key={label}>
                <div className={`mm-stat-icon ${tone}`}><Icon size={20} /></div>
                <div className="mm-stat-label">{label}</div>
                <div className="mm-stat-value">{value}</div>
                <div className={`mm-stat-note ${up ? 'positive' : ''}`}>{up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{note}</div>
              </article>
            ))}
          </div>

          <div className="mm-grid-main">
            <section className="mm-panel mm-chart-panel">
              <div className="mm-panel-head">
                <div><h2>Collection overview</h2><p>Paid and outstanding maintenance for the last 6 months</p></div>
                <button className="mm-select">Last 6 months <ChevronDown size={15} /></button>
              </div>
              <div className="mm-legend"><span><i className="paid" />Collected</span><span><i className="pending" />Outstanding</span></div>
              <MiniChart data={chartData} />
            </section>

            <section className="mm-panel mm-health">
              <div className="mm-panel-head"><div><h2>Collection health</h2><p>Current billing cycle</p></div><Activity size={19} /></div>
              <div className="mm-ring" style={{ '--progress': `${calculatedStats.collectionPercentage || 0}%` }}>
                <div><strong>{calculatedStats.collectionPercentage || 0}%</strong><span>collected</span></div>
              </div>
              <div className="mm-health-row"><span><i className="dot green" />Paid bills</span><strong>{bills.filter((b) => b.payment_status === 'Paid').length}</strong></div>
              <div className="mm-health-row"><span><i className="dot amber" />Pending</span><strong>{bills.filter((b) => b.payment_status === 'Pending').length}</strong></div>
              <div className="mm-health-row"><span><i className="dot red" />Overdue</span><strong>{bills.filter((b) => b.payment_status !== 'Paid' && new Date(b.due_date) < new Date()).length}</strong></div>
            </section>
          </div>

          <div className="mm-grid-lower">
            <section className="mm-panel">
              <div className="mm-panel-head"><div><h2>Recent bills</h2><p>Latest resident invoices</p></div><button className="mm-text-button" onClick={() => setTab('bills')}>View all</button></div>
              {bills.length ? <div className="mm-list">
                {bills.slice(0, 5).map((bill) => (
                  <div className="mm-list-row" key={bill.id}>
                    <div className="mm-avatar">{(bill.resident_name || 'R').slice(0, 1)}</div>
                    <div className="mm-list-main"><strong>{bill.resident_name || 'Resident'}</strong><span>Flat {bill.flat_no || '—'} · {bill.bill_number || `BILL-${bill.id}`}</span></div>
                    <div className="mm-list-amount"><strong>{money(bill.total_amount)}</strong><span className={statusClass(bill.payment_status)}>{bill.payment_status}</span></div>
                  </div>
                ))}
              </div> : <Empty title="No bills yet" copy="Generate your first monthly billing cycle." />}
            </section>

            <section className="mm-panel">
              <div className="mm-panel-head"><div><h2>Top overdue flats</h2><p>Highest outstanding balances</p></div><AlertCircle size={18} /></div>
              {(dashboard.overdueFlats || []).length ? <div className="mm-overdue-list">
                {dashboard.overdueFlats.map((item, index) => (
                  <div key={`${item.flat}-${index}`}><span className="mm-rank">{index + 1}</span><div><strong>Flat {item.flat}</strong><small>{item.resident}</small></div><b>{money(item.amount)}</b></div>
                ))}
              </div> : <Empty title="All caught up" copy="No overdue flats to show." />}
            </section>
          </div>
        </>
      ) : tab === 'bills' ? (
        <section className="mm-panel mm-table-panel">
          <div className="mm-panel-head">
            <div><h2>Maintenance bills</h2><p>{filteredBills.length} bills in this view</p></div>
            <button className="mm-button mm-button-primary" onClick={() => setModal('generate')}><Plus size={17} /> Generate bills</button>
          </div>
          <div className="mm-toolbar">
            <label className="mm-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search bill, resident or flat..." /></label>
            <label className="mm-filter"><Filter size={16} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option><option>Paid</option><option>Pending</option><option>Under Review</option><option>Overdue</option></select></label>
            <label className="mm-filter"><select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}><option>All</option>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
            <label className="mm-filter"><select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}><option>All</option>{yearOptions.map((year) => <option key={year}>{year}</option>)}</select></label>
          </div>
          <div className="mm-table-wrap">
            <table className="mm-table"><thead><tr><th>Bill</th><th>Resident</th><th>Period</th><th>Due date</th><th>Amount</th><th>Status</th><th /></tr></thead>
              <tbody>{filteredBills.map((bill) => (
                <tr key={bill.id}>
                  <td><strong>{bill.bill_number || `BILL-${String(bill.id).padStart(5, '0')}`}</strong><small>{bill.invoice_number || `INV-${bill.id}`}</small></td>
                  <td><strong>{bill.resident_name || 'Resident'}</strong><small>Flat {bill.flat_no || '—'}</small></td>
                  <td>{months[(Number(bill.month) || 1) - 1]} {bill.year}</td><td>{date(bill.due_date)}</td>
                  <td><strong>{money(bill.total_amount)}</strong>{Number(bill.late_fee) > 0 && <small className="mm-late">+{money(bill.late_fee)} late fee</small>}</td>
                  <td><span className={statusClass(bill.payment_status)}>{bill.payment_status}</span></td>
                  <td><button className="mm-icon-btn" onClick={() => { setSelected(bill); setModal('bill'); }}><MoreHorizontal size={18} /></button></td>
                </tr>
              ))}</tbody>
            </table>
            {!filteredBills.length && <Empty title="No matching bills" copy="Try changing the search or status filter." />}
          </div>
        </section>
      ) : tab === 'payments' ? (
        <section className="mm-panel mm-table-panel">
          <div className="mm-panel-head"><div><h2>Payment approvals</h2><p>Review resident payment submissions and update bill status.</p></div><button className="mm-button mm-button-light" onClick={() => downloadCsv('payment-approvals.csv', payments.map((payment) => ({ resident: payment.resident_name, flat: payment.flat_no, method: payment.payment_method, transaction: payment.transaction_id, amount: payment.amount, status: payment.payment_status })))}><Download size={17} /> Export CSV</button></div>
          <div className="mm-table-wrap">
            <table className="mm-table">
              <thead><tr><th>Resident</th><th>Flat</th><th>Method</th><th>Transaction</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{payments.map((payment) => (
                <tr key={payment.id}>
                  <td><strong>{payment.resident_name}</strong><small>{date(payment.created_at)}</small></td>
                  <td>{payment.flat_no}</td>
                  <td>{payment.payment_method}</td>
                  <td>{payment.transaction_id}</td>
                  <td><strong>{money(payment.amount)}</strong></td>
                  <td><span className={statusClass(payment.payment_status)}>{payment.payment_status}</span></td>
                  <td>
                    <div className="mm-action-group">
                      <button className="mm-mini-action green" onClick={() => updatePaymentStatus(payment, 'Paid')}>Approve</button>
                      <button className="mm-mini-action red" onClick={() => updatePaymentStatus(payment, 'Rejected')}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {!payments.length && <Empty title="No payment submissions" copy="Resident payment proofs will appear here for admin approval." />}
          </div>
        </section>
      ) : tab === 'categories' ? (
        <section className="mm-panel">
          <div className="mm-panel-head"><div><h2>Maintenance categories</h2><p>Build a transparent itemised maintenance structure.</p></div><button className="mm-button mm-button-primary" onClick={() => { setSelected(null); setCategoryForm({ name: '', amount: '', calculationType: 'FIXED', active: true }); setModal('category'); }}><Plus size={17} /> Add category</button></div>
          <div className="mm-category-grid">{categories.map((item) => (
            <button className="mm-category" key={item.id} onClick={() => openEditCategory(item)}>
              <span className="mm-category-icon"><CircleDollarSign size={20} /></span>
              <span><strong>{item.name}</strong><small>{item.calculation_type === 'PER_SQ_FT' ? 'Per sq. ft.' : 'Fixed monthly charge'}</small></span>
              <b>{money(item.amount)}</b><i className={item.active ? 'active' : ''}>{item.active ? 'Active' : 'Inactive'}</i>
            </button>
          ))}</div>
          {!categories.length && <Empty title="No categories" copy="Add water, security, lift, sinking fund and other bill items." />}
        </section>
      ) : tab === 'expenses' ? (
        <section className="mm-panel mm-table-panel">
          <div className="mm-panel-head"><div><h2>Maintenance expenses</h2><p>Operational spending and vendor payments.</p></div><button className="mm-button mm-button-primary" onClick={() => setModal('expense')}><Plus size={17} /> Record expense</button></div>
          <div className="mm-expense-summary"><div><span>Current month spend</span><strong>{money(calculatedStats.monthExpense || expenses.reduce((sum, item) => sum + Number(item.amount), 0))}</strong></div><div><span>Transactions</span><strong>{expenses.length}</strong></div><div><span>Pending approval</span><strong>{expenses.filter((item) => item.status === 'Pending').length}</strong></div></div>
          <div className="mm-table-wrap"><table className="mm-table"><thead><tr><th>Expense</th><th>Category</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{expenses.map((item) => <tr key={item.id}><td><strong>{item.expense_number}</strong><small>{item.description || 'Maintenance expense'}</small></td><td>{item.category}</td><td>{item.vendor}</td><td>{date(item.expense_date)}</td><td><strong>{money(item.amount)}</strong></td><td><span className={statusClass(item.status)}>{item.status}</span></td></tr>)}</tbody>
          </table>{!expenses.length && <Empty title="No expenses recorded" copy="Record vendor bills and operational spending here." />}</div>
        </section>
      ) : (
        <section className="mm-panel">
          <div className="mm-panel-head"><div><h2>Reports & exports</h2><p>Download clear, audit-ready financial reports.</p></div><button className="mm-button mm-button-light" onClick={exportCurrentView}><Download size={17} /> Export all CSV</button></div>
          <div className="mm-report-grid">{[
            ['Monthly collection', 'Paid, pending and overdue bills for a selected month', TrendingUp],
            ['Pending dues', 'Resident and flat-wise outstanding balances', AlertCircle],
            ['Expense report', 'Category and vendor-wise expense analysis', Wallet],
            ['Income statement', 'Collection against society maintenance spend', FileText]
          ].map(([name, copy, Icon]) => <button key={name} onClick={() => exportReport(name)}><span><Icon size={20} /></span><strong>{name}</strong><small>{copy}</small><Download size={17} /></button>)}</div>
        </section>
      )}

      {(modal === 'generate' || modal === 'cycle') && <Modal title={modal === 'generate' ? 'Generate monthly bills' : 'Create maintenance cycle'} subtitle="Create a billing cycle for all occupied flats." onClose={() => setModal(null)}>
        <form onSubmit={submitCycle} className="mm-form">
          {modal === 'generate' && cycles.length > 0 && <div className="mm-existing-cycle"><span>Already created a cycle?</span><select defaultValue="" onChange={(e) => e.target.value && generateExisting(e.target.value)} disabled={saving}><option value="">Select and generate...</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.title} · {cycle.month}/{cycle.year}</option>)}</select></div>}
          <label className="mm-field mm-field-full"><span>Cycle title</span><input required value={cycleForm.title} onChange={(e) => setCycleForm({ ...cycleForm, title: e.target.value })} /></label>
          <div className="mm-form-row"><label className="mm-field"><span>Month</span><select value={cycleForm.month} onChange={(e) => setCycleForm({ ...cycleForm, month: e.target.value })}>{months.map((month, index) => <option value={index + 1} key={month}>{month}</option>)}</select></label><label className="mm-field"><span>Year</span><input type="number" min="2020" required value={cycleForm.year} onChange={(e) => setCycleForm({ ...cycleForm, year: e.target.value })} /></label></div>
          <label className="mm-field mm-field-full"><span>Payment due date</span><input type="date" required value={cycleForm.dueDate} onChange={(e) => setCycleForm({ ...cycleForm, dueDate: e.target.value })} /></label>
          <label className="mm-field mm-field-full"><span>Note (optional)</span><textarea rows="3" value={cycleForm.description} onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })} placeholder="Shown internally for this billing cycle" /></label>
          <div className="mm-form-actions"><button type="button" className="mm-button mm-button-light" onClick={() => setModal(null)}>Cancel</button><button className="mm-button mm-button-primary" disabled={saving}>{saving ? <RefreshCcw className="spin" size={17} /> : <CalendarDays size={17} />}{modal === 'generate' ? 'Create & generate' : 'Create cycle'}</button></div>
        </form>
      </Modal>}

      {modal === 'category' && <Modal title={selected ? 'Edit category' : 'Add maintenance category'} subtitle="This item appears in each resident's bill breakdown." onClose={() => setModal(null)}>
        <form onSubmit={submitCategory} className="mm-form">
          <label className="mm-field mm-field-full"><span>Category name</span><input required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g. Lift maintenance" /></label>
          <div className="mm-form-row"><label className="mm-field"><span>Amount</span><div className="mm-money-input"><IndianRupee size={16} /><input type="number" min="0" required value={categoryForm.amount} onChange={(e) => setCategoryForm({ ...categoryForm, amount: e.target.value })} /></div></label><label className="mm-field"><span>Calculation</span><select value={categoryForm.calculationType} onChange={(e) => setCategoryForm({ ...categoryForm, calculationType: e.target.value })}><option value="FIXED">Fixed amount</option><option value="PER_SQ_FT">Per sq. ft.</option></select></label></div>
          <label className="mm-toggle"><input type="checkbox" checked={categoryForm.active} onChange={(e) => setCategoryForm({ ...categoryForm, active: e.target.checked })} /><span />Category is active</label>
          <div className="mm-form-actions"><button type="button" className="mm-button mm-button-light" onClick={() => setModal(null)}>Cancel</button><button className="mm-button mm-button-primary" disabled={saving}>Save category</button></div>
        </form>
      </Modal>}

      {modal === 'expense' && <Modal title="Record expense" subtitle="Add a society maintenance expense or vendor payment." onClose={() => setModal(null)}>
        <form onSubmit={submitExpense} className="mm-form">
          <div className="mm-form-row"><label className="mm-field"><span>Category</span><select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>{['Security Salary', 'Lift Service', 'Electricity', 'Water', 'Cleaning', 'Garden', 'Repairs', 'Painting', 'Fire Safety', 'Generator', 'Others'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="mm-field"><span>Expense date</span><input type="date" required value={expenseForm.expenseDate} onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} /></label></div>
          <label className="mm-field mm-field-full"><span>Vendor</span><input required value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} placeholder="Vendor or service provider" /></label>
          <div className="mm-form-row"><label className="mm-field"><span>Amount</span><input type="number" min="1" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></label><label className="mm-field"><span>Payment method</span><select value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}><option>Bank Transfer</option><option>UPI</option><option>Cheque</option><option>Cash</option></select></label></div>
          <label className="mm-field mm-field-full"><span>Description</span><textarea rows="3" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} /></label>
          <div className="mm-form-actions"><button type="button" className="mm-button mm-button-light" onClick={() => setModal(null)}>Cancel</button><button className="mm-button mm-button-primary" disabled={saving}>Record expense</button></div>
        </form>
      </Modal>}

      {modal === 'bill' && selected && <Modal wide title={selected.bill_number || `Bill #${selected.id}`} subtitle={`${selected.resident_name} · Flat ${selected.flat_no}`} onClose={() => setModal(null)}>
        <div className="mm-bill-preview"><div><span>Total amount</span><strong>{money(selected.total_amount)}</strong></div><div><span>Due date</span><strong>{date(selected.due_date)}</strong></div><div><span>Late fee</span><strong>{money(selected.late_fee)}</strong></div><div><span>Status</span><strong className={statusClass(selected.payment_status)}>{selected.payment_status}</strong></div></div>
        <div className="mm-bill-actions">
          <button className="mm-button mm-button-light" onClick={() => printDocument('Maintenance Invoice', selected)}><FileText size={17} /> Invoice PDF</button>
          {selected.payment_status === 'Paid' && <button className="mm-button mm-button-light" onClick={() => printDocument('Payment Receipt', selected)}><ReceiptIndianRupee size={17} /> Receipt PDF</button>}
          {selected.payment_status !== 'Paid' && <button className="mm-button mm-button-light" onClick={() => markPaid(selected)}><CheckCircle2 size={17} /> Mark Paid</button>}
          {Number(selected.late_fee) > 0 && <button className="mm-button mm-button-light" onClick={async () => { await maintenanceAPI.waiveLateFee(selected.id); notify('Late fee waived'); setModal(null); load(); }}>Waive late fee</button>}
          {selected.payment_status !== 'Paid' && <button className="mm-button mm-button-primary" onClick={() => sendReminder(selected)}><Bell size={17} /> Send reminder</button>}
        </div>
      </Modal>}
    </div>
  );
};

export default Maintenance;
