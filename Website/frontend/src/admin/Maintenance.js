/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, CalendarDays,
  Check, CheckCircle2, ChevronDown, Download, FileBarChart, FileText, Printer,
  Eye, Filter, Image, IndianRupee, LayoutDashboard, Plus, ReceiptIndianRupee,
  RefreshCcw, Search, SlidersHorizontal, TrendingUp, Wallet,
  Trash2, X
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { maintenanceAPI, settingsAPI, userAPI, flatAPI } from '../services/api';
import { printPaymentReceipt, receiptAvailable } from '../utils/paymentReceipt';
import { useTranslation } from 'react-i18next';
import './maintenance.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const date = (value, locale = 'en-IN') => {
  if (!value) return '—';
  const targetLocale = locale === 'hi' ? 'hi-IN' : (locale === 'mr' ? 'mr-IN' : 'en-IN');
  return new Date(value).toLocaleDateString(targetLocale, { day: '2-digit', month: 'short', year: 'numeric' });
};
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
const statusLabel = (status = '', t) => {
  if (!t) return status || 'Pending';
  if (status === 'PARTIAL_WRITE_OFF') return t('statusLabel.partialWriteOff', 'Partial Write-off');
  if (['WRITTEN_OFF', 'SETTLED'].includes(status)) return t('statusLabel.writtenOff', 'Written Off');
  return status ? t(`statusLabel.${status.toLowerCase()}`, status) : t('common.pending', 'Pending');
};
const resolveBillStatus = (bill) => {
  if (!bill) return 'Pending';
  const remainingDue = Number(bill.remaining_due ?? bill.current_due ?? bill.remaining_amount ?? 0);
  const paidAmt = Number(bill.paid_amount || 0);
  const writeOffAmt = Number(bill.write_off_amount || 0);

  if (remainingDue <= 0 && paidAmt > 0) {
    return 'Paid';
  }
  if (remainingDue <= 0 && writeOffAmt > 0 && paidAmt === 0) {
    return bill.write_off_status || 'WRITTEN_OFF';
  }
  if (remainingDue > 0 && paidAmt > 0) {
    return 'Partial';
  }
  if (remainingDue > 0 && writeOffAmt > 0) {
    return bill.write_off_status || 'PARTIAL_WRITE_OFF';
  }
  return bill.payment_status || bill.status || bill.write_off_status || 'Pending';
};
const normalizedStatus = (status = '') => String(status || '').trim().toUpperCase().replace(/\s+/g, '_');
const isPendingPaymentStatus = (status) => ['PENDING', 'PENDING_REVIEW', 'PENDING_VERIFICATION', 'UNDER_REVIEW'].includes(normalizedStatus(status));
const isApprovedPaymentStatus = (status) => ['APPROVED', 'PAID', 'VERIFIED'].includes(normalizedStatus(status));
const isRejectedPaymentStatus = (status) => ['REJECTED', 'DECLINED'].includes(normalizedStatus(status));
const cycleNumber = (year, month) => Number(year) * 12 + Number(month);
const isLocalHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const defaultApiBaseUrl = isLocalHost
  ? 'http://localhost:5000/api'
  : 'https://society-managment-5bh7.onrender.com/api';
const backendOrigin = (process.env.REACT_APP_API_URL || defaultApiBaseUrl).replace(/\/api\/?$/, '').replace(/\/$/, '');
const fileUrl = (value, cacheKey = '') => {
  if (!value) return '';
  const cleanValue = String(value).trim().replace(/\\/g, '/');
  if (/^(data:|blob:)/i.test(cleanValue)) return cleanValue;
  const base = /^https?:/i.test(cleanValue)
    ? cleanValue
    : `${backendOrigin}${cleanValue.startsWith('/') ? cleanValue : `/${cleanValue}`}`;
  if (!cacheKey) return base;
  return `${base}${base.includes('?') ? '&' : '?'}v=${encodeURIComponent(cacheKey)}`;
};
const paymentProofKey = (payment) => [
  payment?.payment_id || payment?.id || '',
  payment?.screenshot_url || payment?.screenshot || payment?.screenshot_path || payment?.payment_screenshot || '',
  payment?.updated_at || payment?.created_at || ''
].join('|');
const paymentProofPath = (payment) => {
  if (payment?.screenshot_path && String(payment.screenshot_path).startsWith('/uploads/')) return payment.screenshot_path;
  return payment?.screenshot_url || payment?.screenshot || payment?.screenshot_path || payment?.payment_screenshot || '';
};
const paymentProofUrl = (payment) => fileUrl(paymentProofPath(payment), paymentProofKey(payment));

function Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div className="mm-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className={`mm-modal ${wide ? 'mm-modal-wide' : ''}`} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="mm-modal-head">
          <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          <button className="mm-icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
          {children}
        </div>
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

function Maintenance() {
  const { t, i18n } = useTranslation();
  const translateMonth = (monthNum) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const key = monthNames[monthNum - 1];
    return t(`months.${key}`, key);
  };
  const [tab, setTab] = useState('bills');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState({});
  const [dashboard, setDashboard] = useState({ summary: initialStats, trend: [], expenseDistribution: [], overdueFlats: [] });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewingScreenshot, setViewingScreenshot] = useState(null);
  const [brokenProofs, setBrokenProofs] = useState({});
  const [rejectingPayment, setRejectingPayment] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  
  // Custom bill editing states
  const [editingBill, setEditingBill] = useState(null);
  const [editBillForm, setEditBillForm] = useState({ amount: '', reason: '' });

  // Write-off states
  const [writeOffBill, setWriteOffBill] = useState(null);
  const [writeOffForm, setWriteOffForm] = useState({ type: 'Maintenance', amount: '', reason: '' });

  // Payment Verification States
  const [rejectionType, setRejectionType] = useState('Invalid Screenshot');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [selectedPaymentIds, setSelectedPaymentIds] = useState(new Set());
  const [viewingDetails, setViewingDetails] = useState(null);
  const [activeActionDropdown, setActiveActionDropdown] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [loadingScreenshot, setLoadingScreenshot] = useState(true);

  // Payments Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const current = new Date();
  
  const [cycleForm, setCycleForm] = useState({ month: current.getMonth() + 1, year: current.getFullYear() });
  const [settingsForm, setSettingsForm] = useState({ title: 'Monthly Maintenance', fixed_amount: '', due_day: 10, late_fee_type: 'fixed', late_fee_value: '', grace_days: 2 });
  const [expenseForm, setExpenseForm] = useState({ category: 'Repairs', vendor: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: 'Bank Transfer', status: 'Paid', description: '' });

  // Manual Bill States
  const [manualBillForm, setManualBillForm] = useState({
    residentId: '',
    flatId: '',
    flatNo: '',
    wing: '',
    month: current.getMonth() + 1,
    year: current.getFullYear(),
    amount: '',
    optionalCharges: '',
    dueDate: '',
    title: 'Monthly Maintenance',
    notes: ''
  });
  const [manualResidents, setManualResidents] = useState([]);
  const [manualFlats, setManualFlats] = useState([]);
  const [manualError, setManualError] = useState('');

  const handleOpenManualBill = async () => {
    setManualError('');
    const now = new Date();
    const defaultMonth = now.getMonth() + 1;
    const defaultYear = now.getFullYear();
    const defaultDueDate = `${defaultYear}-${String(defaultMonth).padStart(2, '0')}-10`;

    setManualBillForm({
      residentId: '',
      flatId: '',
      flatNo: '',
      wing: '',
      month: defaultMonth,
      year: defaultYear,
      amount: settings?.fixed_amount ? String(settings.fixed_amount) : '',
      optionalCharges: '',
      dueDate: defaultDueDate,
      title: 'Monthly Maintenance',
      notes: ''
    });

    setModal('manual_bill');

    try {
      const [usersRes, flatsRes] = await Promise.all([
        userAPI.getAll(),
        flatAPI.getAll()
      ]);
      const residentUsers = unwrap(usersRes, []).filter(
        (u) => String(u.role).toLowerCase() === 'resident'
      );
      const allFlats = unwrap(flatsRes, []);
      setManualResidents(residentUsers);
      setManualFlats(allFlats);
    } catch (err) {
      console.error('Error loading residents for manual bill:', err);
    }
  };

  const handleManualResidentChange = (residentId) => {
    setManualError('');
    const resId = Number(residentId);
    const resident = manualResidents.find((r) => Number(r.id) === resId);

    let flatId = '';
    let flatNo = '';
    let wing = '';
    let targetAmount = manualBillForm.amount;

    if (resident) {
      const flat = manualFlats.find(
        (f) => Number(f.current_resident_id) === resId || Number(f.id) === Number(resident.flat_id)
      );
      if (flat) {
        flatId = flat.id;
        flatNo = flat.flat_no || '';
        wing = flat.wing || '';
        if (flat.maintenance_charge && Number(flat.maintenance_charge) > 0) {
          targetAmount = String(flat.maintenance_charge);
        }
      }
    }

    setManualBillForm((prev) => ({
      ...prev,
      residentId,
      flatId,
      flatNo,
      wing,
      amount: targetAmount || prev.amount || (settings?.fixed_amount ? String(settings.fixed_amount) : '')
    }));
  };

  const submitManualBill = async (e) => {
    e.preventDefault();
    setManualError('');

    if (!manualBillForm.residentId) {
      setManualError('Please select a resident.');
      return;
    }
    if (!manualBillForm.flatId) {
      setManualError('The selected resident does not have an assigned flat. Please assign a flat to this resident first.');
      return;
    }

    const baseAmt = Number(manualBillForm.amount || 0);
    const extraAmt = Number(manualBillForm.optionalCharges || 0);
    const totalAmt = baseAmt + extraAmt;

    if (totalAmt <= 0) {
      setManualError('Total bill amount must be greater than zero.');
      return;
    }

    const isDuplicate = bills.some(
      (b) =>
        (Number(b.resident_id || b.user_id) === Number(manualBillForm.residentId)) &&
        Number(b.month) === Number(manualBillForm.month) &&
        Number(b.year) === Number(manualBillForm.year)
    );

    if (isDuplicate) {
      const monthName = months[manualBillForm.month - 1] || manualBillForm.month;
      setManualError(`A maintenance bill already exists for this resident for ${monthName} ${manualBillForm.year}.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: manualBillForm.title || 'Monthly Maintenance',
        residentId: Number(manualBillForm.residentId),
        flatId: Number(manualBillForm.flatId),
        month: Number(manualBillForm.month),
        year: Number(manualBillForm.year),
        amount: baseAmt,
        optionalCharges: extraAmt,
        dueDate: manualBillForm.dueDate,
        notes: manualBillForm.notes || ''
      };

      if (maintenanceAPI.createManualBill) {
        await maintenanceAPI.createManualBill(payload);
      } else {
        await maintenanceAPI.create(payload);
      }

      setModal(null);
      setToast('Manual maintenance bill created successfully!');
      setTimeout(() => setToast(''), 4000);
      await load();
    } catch (err) {
      console.error('Error creating manual bill:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Error creating manual bill.';
      setManualError(serverMsg);
    } finally {
      setSaving(false);
    }
  };
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setTab(tabParam);
    }
  }, [location]);
  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    const requests = [
      maintenanceAPI.getBills(), maintenanceAPI.getDashboard(),
      maintenanceAPI.getCategories(), maintenanceAPI.getExpenses(), maintenanceAPI.getPayments(),
      maintenanceAPI.getSettings(), settingsAPI.getPayment(), userAPI.getAll()
    ];
    const results = await Promise.allSettled(requests);
    if (results[0].status === 'fulfilled') setBills(unwrap(results[0].value));
    if (results[1].status === 'fulfilled') setDashboard(unwrap(results[1].value, dashboard));
    if (results[3].status === 'fulfilled') setExpenses(unwrap(results[3].value));
    if (results[4].status === 'fulfilled') setPayments(unwrap(results[4].value));
    if (results[5].status === 'fulfilled') setSettings(unwrap(results[5].value, null));
    if (results[6].status === 'fulfilled') setPaymentSettings(results[6].value.data?.data ?? results[6].value.data ?? {});
    if (results[7].status === 'fulfilled') {
      const residentUsers = unwrap(results[7].value, []).filter(
        (u) => String(u.role).toLowerCase() === 'resident'
      );
      setManualResidents(residentUsers);
    }
    if (results.every((result) => result.status === 'rejected')) setError('The maintenance service is unavailable. Start the backend and refresh this page.');
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  useEffect(() => {
    if (tab !== 'payments') return;
    let active = true;
    maintenanceAPI.getPayments()
      .then((response) => {
        if (active) setPayments(unwrap(response));
      })
      .catch(() => {
        if (active) notify('Could not refresh payment submissions');
      });
    return () => {
      active = false;
    };
  }, [tab]);

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        title: settings.title || 'Monthly Maintenance',
        fixed_amount: settings.fixed_amount || '',
        due_day: settings.due_day || 10,
        late_fee_type: settings.late_fee_type || 'fixed',
        late_fee_value: settings.late_fee_value || '',
        grace_days: settings.grace_days || 2
      });
    }
  }, [settings]);

  const nextPendingMonthDetails = useMemo(() => {
    const billsList = Array.isArray(bills) ? bills : [];
    const activeResCount = manualResidents.length > 0 ? manualResidents.length : 1;

    const cycleCounts = {};
    billsList.forEach((bill) => {
      if (bill && bill.year && bill.month && (bill.resident_id || bill.user_id) && bill.flat_id) {
        const c = Number(bill.year) * 12 + Number(bill.month);
        cycleCounts[c] = (cycleCounts[c] || 0) + 1;
      }
    });

    const cycles = Object.keys(cycleCounts).map(Number).sort((a, b) => b - a);

    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;
    const nowCycle = nowYear * 12 + nowMonth;

    let nextCycle;
    if (!cycles.length) {
      nextCycle = nowCycle;
    } else {
      const partiallyGenerated = cycles.filter((c) => cycleCounts[c] < activeResCount).sort((a, b) => a - b);
      if (partiallyGenerated.length > 0) {
        nextCycle = partiallyGenerated[0];
      } else {
        nextCycle = cycles[0] + 1;
      }
    }

    const nextYear = Math.floor((nextCycle - 1) / 12);
    const nextMonth = nextCycle - (nextYear * 12);

    return {
      month: nextMonth,
      year: nextYear,
      cycle: nextCycle,
      label: months[nextMonth - 1] ? `${months[nextMonth - 1]} ${nextYear}` : `${nextMonth} ${nextYear}`
    };
  }, [bills, manualResidents]);

  useEffect(() => {
    if (modal === 'generate' && nextPendingMonthDetails) {
      setCycleForm({
        month: nextPendingMonthDetails.month,
        year: nextPendingMonthDetails.year
      });
    }
  }, [modal, nextPendingMonthDetails]);

  const calculatedStats = useMemo(() => {
    const billsList = Array.isArray(bills) ? bills : [];
    const totalResidents = dashboard?.summary?.residents || 0;
    const collected = billsList.reduce((sum, bill) => sum + Number(bill?.paid_amount || 0), 0);
    const pending = billsList.reduce((sum, bill) => sum + Number(bill?.remaining_due ?? bill?.current_due ?? bill?.remaining_amount ?? 0), 0);
    const writtenOff = billsList.reduce((sum, bill) => sum + Number(bill?.write_off_amount || 0), 0);
    const overdue = billsList.reduce((sum, bill) => {
      const isOverdue = (bill?.payment_status || bill?.status) === 'Overdue';
      return sum + (isOverdue ? Number(bill?.remaining_due ?? bill?.current_due ?? bill?.remaining_amount ?? 0) : 0);
    }, 0);
    const totalAmount = collected + pending;
    const collectionPercentage = totalAmount ? Math.round((collected / totalAmount) * 100) : 0;
    return {
      collected,
      pending,
      writtenOff,
      overdue,
      residents: totalResidents || new Set(billsList.map((b) => b?.resident_id).filter(Boolean)).size,
      collectionPercentage
    };
  }, [bills, dashboard]);

  const filteredBills = useMemo(() => {
    const billsList = Array.isArray(bills) ? bills : [];
    return billsList.filter((bill) => {
      if (!bill) return false;
      const text = `${bill.bill_number || ''} ${bill.invoice_number || ''} ${bill.resident_name || ''} ${bill.flat_no || ''} ${bill.title || ''}`.toLowerCase();
      const currentStatus = bill.payment_status || bill.status;
      const matchesStatus = status === 'All' || currentStatus === status;
      const matchesMonth = monthFilter === 'All' || Number(bill.month) === Number(monthFilter);
      const matchesYear = yearFilter === 'All' || Number(bill.year) === Number(yearFilter);
      return text.includes(query.toLowerCase()) && matchesStatus && matchesMonth && matchesYear;
    });
  }, [bills, query, status, monthFilter, yearFilter]);

  const downloadExcel = (filename, rows) => {
    if (!rows.length) {
      notify('No data available to export');
      return;
    }
    const headers = Object.keys(rows[0]);
    let xml = '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Sheet1"><Table>';
    
    // Headers row
    xml += '<Row>';
    headers.forEach(h => {
      xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>`;
    });
    xml += '</Row>';
    
    // Data rows
    rows.forEach(row => {
      xml += '<Row>';
      headers.forEach(h => {
        const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
        const type = isNaN(val) || val === '' ? 'String' : 'Number';
        xml += `<Cell><Data ss:Type="${type}">${val}</Data></Cell>`;
      });
      xml += '</Row>';
    });
    
    xml += '</Table></Worksheet></Workbook>';
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify('Excel file downloaded');
  };

  const paymentRows = useMemo(() => {
    return payments.flatMap((payment) => {
      const coveredBills = Array.isArray(payment.covered_bills) && payment.covered_bills.length
        ? payment.covered_bills
        : [payment];
      return coveredBills.map((bill, index) => ({
        ...payment,
        id: `${payment.id}-${bill.bill_id || bill.id || index}`,
        payment_id: payment.id,
        bill_id: bill.bill_id || bill.id || payment.bill_id,
        bill_number: bill.bill_number || payment.bill_number,
        month: bill.month || payment.month,
        year: bill.year || payment.year,
        due_date: bill.due_date || payment.due_date,
        amount: bill.total_amount || bill.amount || payment.amount,
        total_amount: bill.total_amount || bill.amount || payment.total_amount,
        payment_status: payment.payment_status || bill.payment_status || bill.status,
        original_payment_status: payment.payment_status,
        flat_no: bill.flat_no || payment.flat_no
      }));
    });
  }, [payments]);

  const filteredPayments = useMemo(() => {
    let list = [...paymentRows];

    // Sort: Pending payments should always appear at the top of the table by default.
    list.sort((a, b) => {
      const statusA = a.original_payment_status || a.payment_status;
      const statusB = b.original_payment_status || b.payment_status;
      const isPendingA = isPendingPaymentStatus(statusA);
      const isPendingB = isPendingPaymentStatus(statusB);

      if (isPendingA && !isPendingB) return -1;
      if (!isPendingA && isPendingB) return 1;

      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });

    return list;
  }, [paymentRows]);

  const paymentsStats = useMemo(() => {
    const totalRequests = payments.length;
    const pendingVerification = payments.filter(p => isPendingPaymentStatus(p.payment_status)).length;
    const approvedPayments = payments.filter(p => isApprovedPaymentStatus(p.payment_status)).length;
    const rejectedPayments = payments.filter(p => isRejectedPaymentStatus(p.payment_status)).length;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const totalReceivedThisMonth = payments
      .filter(p => isApprovedPaymentStatus(p.payment_status) && p.paid_at && new Date(p.paid_at).getMonth() === currentMonth && new Date(p.paid_at).getFullYear() === currentYear)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      
    const pendingCollection = calculatedStats.pending;

    return {
      totalRequests,
      pendingVerification,
      approvedPayments,
      rejectedPayments,
      totalReceivedThisMonth,
      pendingCollection
    };
  }, [payments, calculatedStats.pending]);

  const totalPages = Math.ceil(filteredPayments.length / rowsPerPage);
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredPayments.slice(start, end);
  }, [filteredPayments, currentPage, rowsPerPage]);

  const pendingPayments = useMemo(() => {
    return filteredPayments.filter(p => isPendingPaymentStatus(p.original_payment_status || p.payment_status));
  }, [filteredPayments]);

  const allPendingSelected = useMemo(() => {
    if (!pendingPayments.length) return false;
    return pendingPayments.every(p => selectedPaymentIds.has(p.payment_id));
  }, [pendingPayments, selectedPaymentIds]);

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedPaymentIds(prev => {
        const next = new Set(prev);
        pendingPayments.forEach(p => next.delete(p.payment_id));
        return next;
      });
    } else {
      setSelectedPaymentIds(prev => {
        const next = new Set(prev);
        pendingPayments.forEach(p => next.add(p.payment_id));
        return next;
      });
    }
  };

  const toggleSelectPayment = (paymentId) => {
    setSelectedPaymentIds(prev => {
      const next = new Set(prev);
      if (next.has(paymentId)) {
        next.delete(paymentId);
      } else {
        next.add(paymentId);
      }
      return next;
    });
  };

  const exportPaymentsExcel = () => {
    const rows = filteredPayments.map((payment) => ({
      resident: payment.resident_name,
      flat: payment.flat_no,
      bill: payment.bill_number || `BILL-${payment.bill_id}`,
      month: `${months[(Number(payment.month) || 1) - 1]} ${payment.year || ''}`,
      amount: payment.amount,
      payment_method: payment.payment_method || '',
      payment_date: date(payment.paid_at),
      utr: payment.utr_number || payment.transaction_id,
      submitted_date: date(payment.created_at),
      status: payment.original_payment_status || payment.payment_status
    }));
    downloadExcel('payments-report.xls', rows);
    notify('Export Completed');
  };

  const exportPaymentsCsv = () => {
    const rows = filteredPayments.map((payment) => ({
      resident: payment.resident_name,
      flat: payment.flat_no,
      bill: payment.bill_number || `BILL-${payment.bill_id}`,
      month: `${months[(Number(payment.month) || 1) - 1]} ${payment.year || ''}`,
      amount: payment.amount,
      payment_method: payment.payment_method || '',
      payment_date: date(payment.paid_at),
      utr: payment.utr_number || payment.transaction_id,
      submitted_date: date(payment.created_at),
      status: payment.original_payment_status || payment.payment_status
    }));
    downloadCsv('payments-report.csv', rows);
    notify('Export Completed');
  };

  const printPaymentsReport = () => {
    window.print();
    notify('Export Completed');
  };

  const getReceipt = async (payment) => {
    const response = await maintenanceAPI.getPaymentReceipt(payment.payment_id || payment.id);
    return response.data?.data ?? response.data;
  };

  const handlePrintReceipt = async (payment) => {
    try {
      printPaymentReceipt(await getReceipt(payment), paymentSettings);
    } catch (err) {
      notify(err.message === 'Popup blocked' ? 'Popup blocked. Allow popups to print receipt.' : 'Could not load receipt details');
    }
  };

  const handlePrintBill = async (payment) => {
    const billId = payment.bill_id || payment.billId || payment.id;
    if (!billId) return notify('Bill ID is missing');
    try {
      const response = await maintenanceAPI.getBillById(billId);
      const bill = response.data?.data?.bill || response.data?.bill || response.data?.data || response.data;
      if (!bill) return notify('Bill details unavailable');

      const itemsHtml = bill.items && bill.items.length > 0
        ? bill.items.map(item => `<tr><th>${item.name}</th><td>₹${Number(item.amount || 0).toLocaleString('en-IN')}</td></tr>`).join('')
        : '';
        
      const prevOutstandingHtml = Number(bill.previous_outstanding || 0) > 0
        ? `<tr><th>Previous Outstanding</th><td>₹${Number(bill.previous_outstanding).toLocaleString('en-IN')}</td></tr>`
        : '';

      const html = `
        <html><head><title>Maintenance Invoice - ${bill.bill_number || `BILL-${bill.id}`}</title><style>
        body{font-family:Arial,sans-serif;padding:32px;color:#172033}.box{max-width:760px;margin:0 auto;border:1px solid #dfe5ee;border-radius:14px;padding:28px}
        h1{margin:0;font-size:26px}.muted{color:#667085;margin-top:6px}table{width:100%;border-collapse:collapse;margin-top:24px}
        td,th{border-bottom:1px solid #edf0f3;padding:12px;text-align:left}.total{font-size:22px;font-weight:800}.right{text-align:right}
        </style></head><body><div class="box">
        <h1>Maintenance Invoice</h1><div class="muted">${paymentSettings.societyName || 'Society Management System'}</div>
        <table>
        <tr><th>Bill No.</th><td>${bill.bill_number || `BILL-${bill.id}`}</td></tr>
        <tr><th>Resident</th><td>${bill.resident_name || payment.resident_name || 'Resident'}</td></tr>
        <tr><th>Flat</th><td>${bill.flat_no || payment.flat_no || ''}</td></tr>
        <tr><th>Flat Type</th><td>${bill.flat_type_name || 'Not Assigned'}</td></tr>
        <tr><th>Period</th><td>${months[(Number(bill.month || payment.month) || 1) - 1]} ${bill.year || payment.year || ''}</td></tr>
        <tr><th>Due Date</th><td>${date(bill.due_date)}</td></tr>
        <tr><th>Status</th><td>${bill.write_off_status || bill.payment_status || payment.payment_status}</td></tr>
        <tr><th>Base Maintenance Charge</th><td>₹${Number(bill.amount || bill.total_amount || payment.amount || 0).toLocaleString('en-IN')}</td></tr>
        ${itemsHtml}
        <tr><th>Original Late Fee</th><td>₹${Number(bill.late_fee || bill.penalty_amount || 0).toLocaleString('en-IN')}</td></tr>
        <tr><th>Original Total Bill</th><td>₹${Number(bill.total_amount || payment.amount || 0).toLocaleString('en-IN')}</td></tr>
        ${Number(bill.write_off_amount || bill.writeoff_amount || 0) > 0 ? `<tr><th style="color:#7a5af8;">Write-Off Discount</th><td style="color:#7a5af8;font-weight:bold;">- ₹${Number(bill.write_off_amount || bill.writeoff_amount).toLocaleString('en-IN')}</td></tr>` : ''}
        ${Number(bill.paid_amount || 0) > 0 ? `<tr><th>Amount Paid</th><td>₹${Number(bill.paid_amount).toLocaleString('en-IN')}</td></tr>` : ''}
        ${prevOutstandingHtml}
        <tr><th class="total">Remaining Payable</th><td class="total">₹${Number(bill.remainingPayable !== undefined ? bill.remainingPayable : (bill.remaining_amount !== undefined ? bill.remaining_amount : bill.total_amount || payment.amount)).toLocaleString('en-IN')}</td></tr>
        </table><p class="muted right">Generated on ${new Date().toLocaleString('en-IN')}</p>
        </div><script>window.print();</script></body></html>`;
      const docWindow = window.open('', '_blank', 'width=900,height=700');
      if (!docWindow) return notify('Popup blocked. Allow popups to print bill.');
      docWindow.document.write(html);
      docWindow.document.close();
    } catch (err) {
      notify('Failed to load bill details');
    }
  };



  const handleApprovePayment = async (payment) => {
    if (!window.confirm(`Are you sure you want to approve the payment of ${money(payment.amount)} from ${payment.resident_name}?`)) {
      return;
    }
    setSaving(true);
    try {
      await maintenanceAPI.approvePayment(payment.payment_id || payment.id);
      notify('Payment approved successfully.');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not approve payment');
    } finally {
      setSaving(false);
    }
  };

  const handleSingleReject = async (payment, reason) => {
    setSaving(true);
    try {
      await maintenanceAPI.rejectPayment(payment.payment_id || payment.id, { rejectionReason: reason });
      notify('Payment rejected successfully.');
      setRejectingPayment(null);
      setCustomRejectionReason('');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not reject payment');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkReject = async (reason) => {
    const ids = Array.from(selectedPaymentIds);
    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      await Promise.all(
        ids.map(async (id) => {
          try {
            await maintenanceAPI.rejectPayment(id, { rejectionReason: reason });
            successCount++;
          } catch (err) {
            errorCount++;
          }
        })
      );

      notify(`Successfully rejected ${successCount} payments.${errorCount > 0 ? ` Failed to reject ${errorCount} payments.` : ''}`);
      setSelectedPaymentIds(new Set());
      setRejectingPayment(null);
      setCustomRejectionReason('');
      await load();
    } catch (err) {
      notify('An error occurred during bulk rejection');
    } finally {
      setSaving(false);
    }
  };

  const submitRejectionForm = async (e) => {
    e.preventDefault();
    const reason = rejectionType === 'Other' ? customRejectionReason.trim() : rejectionType;
    if (!reason) return notify('Rejection reason is required');

    if (rejectingPayment && rejectingPayment.id === 'bulk') {
      await handleBulkReject(reason);
    } else if (rejectingPayment) {
      await handleSingleReject(rejectingPayment, reason);
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedPaymentIds);
    if (!ids.length) return;

    if (!window.confirm(`Are you sure you want to approve ${ids.length} selected payments?`)) {
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      await Promise.all(
        ids.map(async (id) => {
          try {
            await maintenanceAPI.approvePayment(id);
            successCount++;
          } catch (err) {
            errorCount++;
          }
        })
      );

      notify(`Successfully approved ${successCount} payments.${errorCount > 0 ? ` Failed to approve ${errorCount} payments.` : ''}`);
      setSelectedPaymentIds(new Set());
      await load();
    } catch (err) {
      notify('An error occurred during bulk approval');
    } finally {
      setSaving(false);
    }
  };

  const handleReconsiderPayment = async (payment) => {
    setSaving(true);
    try {
      await maintenanceAPI.updatePayment(payment.payment_id || payment.id, {
        paymentStatus: 'Pending Verification',
        remarks: 'Reconsidering payment verification'
      });
      notify('Payment returned to pending verification status');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not reconsider payment');
    } finally {
      setSaving(false);
    }
  };

  const exportSelectedPayments = () => {
    const ids = Array.from(selectedPaymentIds);
    const selectedRows = paymentRows.filter(row => ids.includes(row.payment_id));
    if (!selectedRows.length) {
      notify('No payments selected to export');
      return;
    }
    const dataToExport = selectedRows.map((payment) => ({
      resident: payment.resident_name,
      flat: payment.flat_no,
      bill: payment.bill_number || `BILL-${payment.bill_id}`,
      month: `${months[(Number(payment.month) || 1) - 1]} ${payment.year || ''}`,
      amount: payment.amount,
      payment_method: payment.payment_method || '',
      payment_date: date(payment.paid_at),
      utr: payment.utr_number || payment.transaction_id,
      submitted_date: date(payment.created_at),
      status: payment.original_payment_status || payment.payment_status
    }));
    downloadCsv('selected-payments.csv', dataToExport);
    notify('Export Completed');
  };

  const downloadScreenshot = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'screenshot.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = filename || 'screenshot.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const yearOptions = useMemo(() => {
    const billsList = Array.isArray(bills) ? bills : [];
    const years = [...new Set(billsList.map((bill) => bill && Number(bill.year)).filter(Boolean))].sort((a, b) => b - a);
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

    const billsList = Array.isArray(bills) ? bills : [];
    if (billsList.length) {
      billsList.forEach((bill) => {
        if (!bill) return;
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
        bucket.collected += Number(bill.paid_amount || 0);
        bucket.pending += Number(bill.remaining_due ?? bill.current_due ?? bill.remaining_amount ?? 0);
      });
      return timeline;
    }

    (dashboard?.trend || []).forEach((item) => {
      if (!item) return;
      const monthIndex = shortMonths.findIndex((month) => month.toLowerCase() === String(item.month).slice(0, 3).toLowerCase());
      if (monthIndex < 0) return;
      const bucket = timeline.find((value) => value.month === shortMonths[monthIndex]);
      if (!bucket) return;
      bucket.collected = Number(item.collected || 0);
      bucket.pending = Number(item.pending || 0);
    });

    return timeline;
  }, [bills, dashboard]);

  const expenseSummary = useMemo(() => {
    const now = new Date();
    const currentMonthSpend = expenses.reduce((sum, item) => {
      const expenseDate = item.expense_date ? new Date(item.expense_date) : null;
      const isCurrentMonth = expenseDate
        && expenseDate.getMonth() === now.getMonth()
        && expenseDate.getFullYear() === now.getFullYear();
      return sum + (isCurrentMonth ? Number(item.amount || 0) : 0);
    }, 0);

    return {
      currentMonthSpend,
      transactions: expenses.length,
      pendingApproval: expenses.filter((item) => item.status === 'Pending').length
    };
  }, [expenses]);

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

  const billRows = (items = filteredBills) => {
    const itemsList = Array.isArray(items) ? items : [];
    return itemsList.map((bill) => {
      if (!bill) return {};
      return {
        resident: bill.resident_name || '',
        flat: bill.flat_no || '',
        month: months[(Number(bill.month) || 1) - 1] || '',
        year: bill.year || '',
        title: bill.title || '',
        base_amount: Number(bill.amount || 0),
        penalty: Number(bill.penalty_amount || 0),
        total_amount: Number(bill.total_amount || 0),
        paid_amount: Number(bill.paid_amount || 0),
        write_off_amount: Number(bill.write_off_amount || 0),
        remaining_amount: Number(bill.remaining_due ?? bill.current_due ?? bill.remaining_amount ?? 0),
        due_date: date(bill.due_date),
        status: statusLabel(resolveBillStatus(bill), t)
      };
    });
  };

  const exportCurrentView = () => {
    if (tab === 'bills') return downloadCsv('maintenance-records.csv', billRows());
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
      { metric: 'Written off amount', value: calculatedStats.writtenOff },
      { metric: 'Overdue amount', value: calculatedStats.overdue },
      { metric: 'Collection rate', value: `${calculatedStats.collectionPercentage || 0}%` },
      { metric: 'Total residents', value: calculatedStats.residents },
      ...chartData.map((item) => ({ metric: `${item.month} collected`, value: item.collected })),
      ...chartData.map((item) => ({ metric: `${item.month} outstanding`, value: item.pending }))
    ]);
  };

  const exportReport = (type) => {
    if (type === 'Monthly collection') return downloadCsv('monthly-collection.csv', chartData.map((item) => ({ month: item.month, collected: item.collected, outstanding: item.pending })));
    if (type === 'Pending dues') return downloadCsv('pending-dues.csv', billRows(bills.filter((bill) => (bill.payment_status || bill.status) !== 'Paid')));
    if (type === 'Expense report') return downloadCsv('expense-report.csv', expenses.map((item) => ({ expense_number: item.expense_number, category: item.category, vendor: item.vendor, amount: Number(item.amount || 0), status: item.status })));
    return exportCurrentView();
  };

  const submitSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await maintenanceAPI.saveSettings({
        title: settingsForm.title,
        fixed_amount: Number(settingsForm.fixed_amount || 0),
        due_day: Number(settingsForm.due_day),
        late_fee_type: settingsForm.late_fee_type,
        late_fee_value: Number(settingsForm.late_fee_value),
        grace_days: Number(settingsForm.grace_days)
      });
      notify('Monthly maintenance rules saved');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not save configurations');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPenalty = async () => {
    setSaving(true);
    try {
      await maintenanceAPI.applyPenalty();
      notify('Penalties calculated and applied successfully');
      await load();
    } catch (err) {
      notify('Could not apply penalties');
    } finally {
      setSaving(false);
    }
  };



  const getCycleGenerationInfo = (month, year) => {
    const billsList = Array.isArray(bills) ? bills : [];
    const billsForCycle = billsList.filter(
      (b) => Number(b.month) === Number(month) && Number(b.year) === Number(year)
    );
    return { count: billsForCycle.length };
  };

  const validateGenerationCycle = () => {
    if (!cycleForm || !cycleForm.year || !cycleForm.month) {
      return 'Invalid selected month or year.';
    }

    const { count } = getCycleGenerationInfo(cycleForm.month, cycleForm.year);
    const activeResidentCount = manualResidents.length > 0 ? manualResidents.length : 1;

    // Only block if ALL active residents already have bills for this selected month & year
    if (count > 0 && activeResidentCount > 0 && count >= activeResidentCount) {
      const monthName = months[cycleForm.month - 1] || cycleForm.month;
      return `Maintenance bills for ${monthName} ${cycleForm.year} have already been generated for all residents.`;
    }

    const billsList = Array.isArray(bills) ? bills : [];
    const cycleCounts = {};
    billsList.forEach((bill) => {
      if (bill && bill.year && bill.month && (bill.resident_id || bill.user_id) && bill.flat_id) {
        const c = Number(bill.year) * 12 + Number(bill.month);
        cycleCounts[c] = (cycleCounts[c] || 0) + 1;
      }
    });

    const cycles = Object.keys(cycleCounts).map(Number).sort((a, b) => b - a);
    if (!cycles.length) {
      return '';
    }

    const selectedCycle = cycleNumber(cycleForm.year, cycleForm.month);
    const latestCycle = cycles[0]; // Highest cycle with any bill in system
    const fullyGenerated = cycles.filter((c) => cycleCounts[c] >= activeResidentCount);
    const latestFullCycle = fullyGenerated.length > 0 ? fullyGenerated[0] : latestCycle;
    const nextPendingCycle = latestFullCycle > 0 ? latestFullCycle + 1 : 0;

    // 1. Block generating past/previous months (e.g. March when August/September exists)
    if (selectedCycle < latestCycle && count >= activeResidentCount) {
      const monthName = months[cycleForm.month - 1] || cycleForm.month;
      return `Maintenance bills for ${monthName} ${cycleForm.year} have already been generated for all residents.`;
    }

    if (selectedCycle < latestCycle && count === 0) {
      return 'Previous months cannot be generated.';
    }

    // 2. Block generating future months if previous pending month has not been generated
    if (nextPendingCycle > 0 && selectedCycle > nextPendingCycle && count < activeResidentCount) {
      const nextPendingYear = Math.floor((nextPendingCycle - 1) / 12);
      const nextPendingMonth = nextPendingCycle - (nextPendingYear * 12);
      const nextPendingMonthName = months[nextPendingMonth - 1] || nextPendingMonth;
      return `${nextPendingMonthName} ${nextPendingYear} maintenance has not been generated yet. Please generate ${nextPendingMonthName} ${nextPendingYear} first.`;
    }

    return '';
  };

  const submitCycle = async (e) => {
    e.preventDefault();
    const validationMessage = validateGenerationCycle();
    if (validationMessage) {
      notify(validationMessage);
      return;
    }

    setSaving(true);
    try {
      const res = await maintenanceAPI.generateBills({
        month: Number(cycleForm.month),
        year: Number(cycleForm.year)
      });
      notify(res.data?.message || 'Monthly bills generated successfully');
      setModal(null);
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not generate bills');
    } finally {
      setSaving(false);
    }
  };

  const submitExpense = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await maintenanceAPI.createExpense(expenseForm); notify('Expense recorded'); setModal(null); await load(); }
    catch (err) { notify(err.response?.data?.message || 'Could not record expense'); }
    finally { setSaving(false); }
  };

  const handleEditBill = (bill) => {
    setEditingBill(bill);
    setEditBillForm({
      amount: String(bill.amount),
      reason: bill.custom_reason || ''
    });
    setModal('edit_bill');
  };


  const submitEditBill = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await maintenanceAPI.update(editingBill.id, {
        amount: Number(editBillForm.amount),
        custom_reason: editBillForm.reason
      });
      notify('Bill updated successfully');
      setModal(null);
      setEditingBill(null);
      await load();
    } catch (err) {
      console.error('Error updating bill:', err);
      notify(err.response?.data?.message || 'Could not update bill');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBill = async (bill) => {
    const residentName = bill.resident_name || 'Resident';
    const flatNo = bill.flat_no ? `Flat ${bill.flat_no}` : '';
    const monthName = translateMonth(Number(bill.month) || 1);
    const billLabel = `${residentName} (${flatNo} - ${monthName} ${bill.year})`;

    if (!window.confirm(`Are you sure you want to delete the maintenance bill for ${billLabel}? This will also remove associated payment records.`)) {
      return;
    }

    setSaving(true);
    try {
      await maintenanceAPI.delete(bill.id);
      notify('Maintenance bill deleted successfully');
      await load();
    } catch (err) {
      console.error('Error deleting bill:', err);
      notify(err.response?.data?.message || 'Could not delete maintenance bill');
    } finally {
      setSaving(false);
    }
  };

  const handleWriteOffClick = (bill) => {
    setWriteOffBill(bill);
    const rem = Number(bill.remaining_due ?? bill.current_due ?? bill.remaining_amount ?? bill.total_amount ?? bill.amount ?? 0);
    setWriteOffForm({
      type: 'Maintenance',
      writeoffType: rem > 0 ? 'PARTIAL' : 'TOTAL',
      amount: String(rem > 0 ? rem : bill.amount || 0),
      reason: 'Management Approval',
      remarks: ''
    });
    setModal('writeoff');
  };

  const submitWriteOff = async (e) => {
    e.preventDefault();
    if (!writeOffForm.reason || !writeOffForm.reason.trim()) {
      notify('A reason is mandatory for performing a write-off');
      return;
    }

    const currentDue = Number(writeOffBill.remaining_due ?? writeOffBill.current_due ?? writeOffBill.remaining_amount ?? 0);
    const totalBill = Number(writeOffBill.total_amount || writeOffBill.amount || 0);
    const maxAllowed = currentDue > 0 ? currentDue : totalBill;
    const amountToOff = writeOffForm.writeoffType === 'TOTAL' ? maxAllowed : Number(writeOffForm.amount);

    if (!amountToOff || amountToOff <= 0) {
      notify('Please enter a valid write-off amount');
      return;
    }

    if (!window.confirm(`Are you sure you want to approve this write-off of amount ₹${amountToOff}?`)) {
      return;
    }

    setSaving(true);
    try {
      await maintenanceAPI.createWriteOff(writeOffBill.id, {
        type: writeOffForm.writeoffType === 'TOTAL' ? 'Full' : 'Partial',
        reason: writeOffForm.reason,
        amount: amountToOff,
        remarks: writeOffForm.remarks || ''
      });
      notify('Write-off applied successfully');
      setModal(null);
      setWriteOffBill(null);
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not record write-off');
    } finally {
      setSaving(false);
    }
  };

  const applyExpenseRemovalToDashboard = (expense) => {
    const expenseAmount = Number(expense?.amount || 0);
    const expenseDate = expense?.expense_date ? new Date(expense.expense_date) : null;
    const now = new Date();
    const isCurrentMonth = expenseDate
      && expenseDate.getMonth() === now.getMonth()
      && expenseDate.getFullYear() === now.getFullYear();

    setDashboard((currentDashboard) => ({
      ...currentDashboard,
      summary: {
        ...(currentDashboard?.summary || initialStats),
        monthExpense: Math.max(0, Number(currentDashboard?.summary?.monthExpense || 0) - (isCurrentMonth ? expenseAmount : 0))
      },
      expenseDistribution: (currentDashboard?.expenseDistribution || []).map((item) => (
        item.name === expense?.category ? { ...item, value: Math.max(0, Number(item.value || 0) - expenseAmount) } : item
      )).filter((item) => Number(item.value || 0) > 0)
    }));
  };

  const confirmDeleteExpense = async () => {
    if (!deletingExpense || deletingExpenseId) return;
    const expenseToDelete = deletingExpense;
    const previousExpenses = expenses;
    const previousDashboard = dashboard;

    setDeletingExpenseId(expenseToDelete.id);
    setExpenses((currentExpenses) => currentExpenses.filter((item) => item.id !== expenseToDelete.id));
    applyExpenseRemovalToDashboard(expenseToDelete);

    try {
      await maintenanceAPI.deleteExpense(expenseToDelete.id);
      notify('Expense deleted successfully.');
      setDeletingExpense(null);
    } catch (err) {
      setExpenses(previousExpenses);
      setDashboard(previousDashboard);
      if (err.response?.status === 404) {
        notify('Expense not found.');
        setDeletingExpense(null);
      } else {
        notify('Failed to delete expense. Please try again.');
      }
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const statCards = [
    { label: t('maintenance.totalCollected'), value: money(calculatedStats.collected), note: t('maintenance.accumulated'), icon: IndianRupee, tone: 'blue', up: true },
    { label: t('maintenance.totalPending'), value: money(calculatedStats.pending), note: t('maintenance.outstanding'), icon: Wallet, tone: 'amber' },
    { label: t('maintenance.writtenOff'), value: money(calculatedStats.writtenOff), note: t('maintenance.adminApprovals'), icon: ReceiptIndianRupee, tone: 'indigo' },
    { label: t('maintenance.overdueAmount'), value: money(calculatedStats.overdue), note: t('maintenance.graceExpired'), icon: AlertCircle, tone: 'red' },
    { label: t('maintenance.totalResidents'), value: calculatedStats.residents, note: t('maintenance.registeredMembers'), icon: Activity, tone: 'indigo', up: true },
    { label: t('maintenance.collectionRate'), value: `${calculatedStats.collectionPercentage || 0}%`, note: t('maintenance.overallPerformance'), icon: TrendingUp, tone: 'green', up: true }
  ];

  const hasChartData = useMemo(() => {
    return chartData.some(bucket => bucket.collected > 0 || bucket.pending > 0);
  }, [chartData]);

  return (
    <div className="mm-shell">
      {toast && <div className="mm-toast"><CheckCircle2 size={18} />{toast}</div>}
      <div className="mm-page-head">
        <div>
          <div className="mm-eyebrow">{t('nav.maintenance')}</div>
          <h1>{t('maintenance.title')}</h1>
          <p>{t('maintenance.subtitle')}</p>
        </div>
        <div className="mm-head-actions">
          <button className="mm-button mm-button-light" onClick={handleApplyPenalty} disabled={saving}><RefreshCcw size={17} className={saving ? 'spin' : ''} /> {t('maintenance.checkOverdue')}</button>
          <button className="mm-button mm-button-light" onClick={exportCurrentView}><Download size={17} /> {t('maintenance.exportCsv')}</button>
          <button className="mm-button mm-button-primary" onClick={() => setModal('generate')}><Plus size={18} /> {t('maintenance.generateBills')}</button>
          <button className="mm-button mm-button-primary" style={{ backgroundColor: '#2563eb' }} onClick={handleOpenManualBill}><FileText size={18} /> {t('maintenance.createManualBill', 'Create Manual Bill')}</button>
        </div>
      </div>

      <div className="mm-tabs" role="tablist">
        {[
          ['overview', LayoutDashboard, t('maintenance.overview')], ['bills', ReceiptIndianRupee, t('maintenance.bills')],
          ['settings', SlidersHorizontal, t('maintenance.settings')],
          ['expenses', Wallet, t('maintenance.expenses')],
          ['payments', CheckCircle2, t('maintenance.payments')], ['reports', FileBarChart, t('maintenance.reports')]
        ].map(([key, Icon, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon size={17} />{label}</button>
        ))}
      </div>

      {error && <div className="mm-alert"><AlertCircle size={18} /><span>{error}</span><button onClick={load}>Retry</button></div>}

      {loading ? (
        <div className="mm-skeleton-grid">{[1, 2, 3, 4].map((i) => <div key={i} className="mm-skeleton" />)}</div>
      ) : tab === 'overview' ? (
        <>
          <div className="mm-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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
            {hasChartData ? (
              <section className="mm-panel mm-chart-panel">
                <div className="mm-panel-head">
                  <div><h2>{t('maintenance.collectionOverview')}</h2><p>{t('maintenance.collectionSubtitle')}</p></div>
                  <button className="mm-select">Last 6 months <ChevronDown size={15} /></button>
                </div>
                <div className="mm-legend"><span><i className="paid" />{t('common.paid', 'Paid')}</span><span><i className="pending" />{t('common.pending', 'Pending')}</span></div>
                <MiniChart data={chartData} />
              </section>
            ) : null}

            <section className="mm-panel mm-health">
              <div className="mm-panel-head"><div><h2>{t('maintenance.collectionHealth')}</h2><p>{t('maintenance.currentBillingCycle')}</p></div><Activity size={19} /></div>
              <div className="mm-ring" style={{ '--progress': `${calculatedStats.collectionPercentage || 0}%` }}>
                <div><strong>{calculatedStats.collectionPercentage || 0}%</strong><span>{t('maintenance.totalCollected')}</span></div>
              </div>
              <div className="mm-health-row"><span><i className="dot green" />{t('common.paid', 'Paid')}</span><strong>{bills.filter((b) => ['Paid', 'PAID', 'SETTLED', 'WRITTEN_OFF'].includes(b.payment_status || b.status)).length}</strong></div>
              <div className="mm-health-row"><span><i className="dot amber" />{t('common.pending', 'Pending')}</span><strong>{bills.filter((b) => (b.payment_status || b.status) === 'Pending').length}</strong></div>
              <div className="mm-health-row"><span><i className="dot red" />{t('common.overdue', 'Overdue')}</span><strong>{bills.filter((b) => (b.payment_status || b.status) === 'Overdue').length}</strong></div>
            </section>
          </div>

          <div className="mm-grid-lower">
            <section className="mm-panel">
              <div className="mm-panel-head"><div><h2>{t('maintenance.recentBills')}</h2><p>{t('maintenance.recentBills')}</p></div><button className="mm-text-button" onClick={() => setTab('bills')}>{t('common.viewAll')}</button></div>
              {bills.length ? <div className="mm-list">
                {bills.slice(0, 5).map((bill) => (
                  <div className="mm-list-row" key={bill.id}>
                    <div className="mm-avatar">{(bill.resident_name || 'R').slice(0, 1)}</div>
                    <div className="mm-list-main"><strong>{bill.resident_name || 'Resident'}</strong><span>{t('common.flat')} {bill.flat_no || '—'} · {translateMonth(bill.month)} {bill.year}</span></div>
                    <div className="mm-list-amount"><strong>{money(bill.total_amount)}</strong><span className={statusClass(bill.write_off_status || bill.payment_status || bill.status)}>{statusLabel(bill.write_off_status || bill.payment_status || bill.status, t)}</span></div>
                  </div>
                ))}
              </div> : <Empty title={t('common.noData', 'No data available')} copy="" />}
            </section>

            <section className="mm-panel">
              <div className="mm-panel-head"><div><h2>{t('maintenance.topOverdueFlats')}</h2><p>{t('maintenance.topOverdueFlats')}</p></div><AlertCircle size={18} /></div>
              {(dashboard.overdueFlats || []).length ? <div className="mm-overdue-list">
                {dashboard.overdueFlats.map((item, index) => (
                  <div key={`${item.flat}-${index}`}><span className="mm-rank">{index + 1}</span><div><strong>{t('common.flat')} {item.flat}</strong><small>{item.resident}</small></div><b>{money(item.amount)}</b></div>
                ))}
              </div> : <Empty title={t('common.noData', 'No data available')} copy="" />}
            </section>
          </div>
        </>
      ) : tab === 'bills' ? (
        <section className="mm-panel mm-table-panel">
          <div className="mm-panel-head">
            <div><h2>{t('maintenance.billsTitle')}</h2><p>{t('maintenance.billsInView', { count: filteredBills.length })}</p></div>
            <button className="mm-button mm-button-primary" onClick={() => setModal('generate')}><Plus size={17} /> {t('maintenance.generateBills')}</button>
          </div>
          <div className="mm-toolbar">
            <label className="mm-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('maintenance.searchResidentFlat')} /></label>
            <label className="mm-filter"><Filter size={16} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option>{t('maintenance.all')}</option><option>Paid</option><option>Pending</option><option>Partial</option><option>Under Review</option><option>Overdue</option><option>PARTIAL_WRITE_OFF</option><option>WRITTEN_OFF</option><option>SETTLED</option></select></label>
            <label className="mm-filter"><select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}><option>{t('maintenance.all')}</option>{months.map((month, index) => <option key={month} value={index + 1}>{translateMonth(index + 1)}</option>)}</select></label>
            <label className="mm-filter"><select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}><option>{t('maintenance.all')}</option>{yearOptions.map((year) => <option key={year}>{year}</option>)}</select></label>
          </div>
          <div className="mm-table-wrap">
            {filteredBills.length > 0 ? (
              <table className="mm-table">
                <thead>
                  <tr>
                    <th>{t('common.resident')}</th>
                    <th>{t('common.flat')}</th>
                    <th>{t('dashboard.month')}</th>
                    <th>{t('maintenance.year')}</th>
                    <th>{t('maintenance.baseAmount')}</th>
                    <th>{t('maintenance.penalty')}</th>
                    <th>{t('maintenance.totalAmount')}</th>
                    <th>{t('common.paid', 'Paid')}</th>
                    <th>{t('maintenance.writeOff')}</th>
                    <th>{t('maintenance.remaining')}</th>
                    <th>{t('common.dueDate', 'Due Date')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>{filteredBills.map((bill) => {
                  const currentStatus = resolveBillStatus(bill);
                  const remainingDue = bill.remaining_due ?? bill.current_due ?? bill.remaining_amount;
                  return (
                    <tr key={bill.id}>
                      <td><strong>{bill.resident_name || 'Resident'}</strong></td>
                      <td>{t('common.flat')} {bill.flat_no || '—'}</td>
                      <td>{translateMonth(Number(bill.month) || 1)}</td>
                      <td>{bill.year}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{money(bill.amount)}</span>
                          {bill.is_custom_amount && (
                            <span 
                              className="mm-status mm-status-pending"
                              style={{ 
                                cursor: 'help', 
                                fontSize: '10px', 
                                padding: '1px 6px',
                                textTransform: 'capitalize',
                                backgroundColor: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                borderRadius: '4px'
                              }}
                              title={`Original Amount: ${money(bill.default_maintenance_amount)}\nDifference: ${money(Number(bill.final_maintenance_amount) - Number(bill.default_maintenance_amount))}\nEdited by: ${bill.edited_by_name || 'Admin'}\nReason: ${bill.custom_reason || 'N/A'}`}
                            >
                              {t('maintenance.custom')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-red-500 font-semibold">{money(bill.penalty_amount)}</td>
                      <td><strong>{money(bill.total_amount)}</strong></td>
                      <td className="text-green-600 font-semibold">{money(bill.paid_amount)}</td>
                      <td className="text-blue-600 font-semibold">{money(bill.write_off_amount)}</td>
                      <td><strong>{money(remainingDue)}</strong></td>
                      <td>{date(bill.due_date, i18n.language)}</td>
                      <td><span className={statusClass(currentStatus)}>{statusLabel(currentStatus, t)}</span></td>
                      <td>
                        <div className="mm-action-group">
                          <button
                            className="mm-mini-action"
                            style={{ 
                              padding: '2px 8px', 
                              fontSize: '11px', 
                              backgroundColor: '#e0f2fe', 
                              color: '#0369a1',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleEditBill(bill)}
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            className="mm-mini-action"
                            style={{ 
                              padding: '2px 8px', 
                              fontSize: '11px', 
                              backgroundColor: '#fee2e2', 
                              color: '#b91c1c',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleWriteOffClick(bill)}
                          >
                            {t('maintenance.writeOff')}
                          </button>
                          <button
                            className="mm-mini-action"
                            style={{ 
                              padding: '2px 8px', 
                              fontSize: '11px', 
                              backgroundColor: '#fef2f2', 
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleDeleteBill(bill)}
                          >
                            {t('common.delete', 'Delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            ) : (
              <Empty title={t('common.noData', 'No data available')} copy="" />
            )}
          </div>
        </section>
      ) : tab === 'settings' ? (
        <section className="mm-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="mm-panel-head">
            <div>
              <h2>{t('maintenance.monthlyRules')}</h2>
              <p>{t('maintenance.monthlyRulesSubtitle')}</p>
            </div>
          </div>
          <form onSubmit={submitSettings} className="mm-form p-4">
            <label className="mm-field mm-field-full">
              <span>{t('maintenance.maintenanceTitle')}</span>
              <input required value={settingsForm.title} onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })} placeholder="e.g. Monthly Maintenance" />
            </label>
            <div className="mm-form-row">
              <label className="mm-field mm-field-full">
                <span>{t('maintenance.dueDayOfMonth')}</span>
                <input type="number" min="1" max="28" required value={settingsForm.due_day} onChange={(e) => setSettingsForm({ ...settingsForm, due_day: e.target.value })} placeholder="e.g. 10" />
              </label>
            </div>
            <div className="mm-form-row">
              <label className="mm-field">
                <span>{t('maintenance.lateFeeType')}</span>
                <select value={settingsForm.late_fee_type} onChange={(e) => setSettingsForm({ ...settingsForm, late_fee_type: e.target.value })}>
                  <option value="fixed">{t('maintenance.fixedAmount')}</option>
                  <option value="percentage">{t('maintenance.percentage')}</option>
                </select>
              </label>
              <label className="mm-field">
                <span>{t('maintenance.penaltyRateValue')}</span>
                <input type="number" min="0" required value={settingsForm.late_fee_value} onChange={(e) => setSettingsForm({ ...settingsForm, late_fee_value: e.target.value })} placeholder="e.g. 100 or 5" />
              </label>
            </div>
            <label className="mm-field mm-field-full">
              <span>{t('maintenance.graceDays')}</span>
              <input type="number" min="0" required value={settingsForm.grace_days} onChange={(e) => setSettingsForm({ ...settingsForm, grace_days: e.target.value })} placeholder="e.g. 2" />
            </label>
            <div className="mm-form-actions">
              <button className="mm-button mm-button-primary" disabled={saving} style={{ width: '100%', marginTop: '12px' }}>
                {saving ? t('maintenance.savingRules') : t('maintenance.saveConfiguration')}
              </button>
            </div>
          </form>
        </section>
      ) : tab === 'payments' ? (
        <>
          <div className="mm-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
            <article className="mm-stat">
              <div className="mm-stat-icon blue"><Activity size={20} /></div>
              <div className="mm-stat-label">{t('maintenance.totalPaymentRequests')}</div>
              <div className="mm-stat-value">{paymentsStats.totalRequests}</div>
              <div className="mm-stat-note">{t('maintenance.submittedSubmissions')}</div>
            </article>
            <article className="mm-stat">
              <div className="mm-stat-icon amber"><AlertCircle size={20} /></div>
              <div className="mm-stat-label">{t('maintenance.pendingVerification')}</div>
              <div className="mm-stat-value">{paymentsStats.pendingVerification}</div>
              <div className="mm-stat-note">{t('maintenance.awaitingAdmin')}</div>
            </article>
            <article className="mm-stat">
              <div className="mm-stat-icon green"><CheckCircle2 size={20} /></div>
              <div className="mm-stat-label">{t('maintenance.approvedPayments')}</div>
              <div className="mm-stat-value">{paymentsStats.approvedPayments}</div>
              <div className="mm-stat-note">{t('maintenance.successfullyVerified')}</div>
            </article>
            <article className="mm-stat">
              <div className="mm-stat-icon red"><X size={20} /></div>
              <div className="mm-stat-label">{t('maintenance.rejectedPayments')}</div>
              <div className="mm-stat-value">{paymentsStats.rejectedPayments}</div>
              <div className="mm-stat-note">{t('maintenance.invalidSubmissions')}</div>
            </article>
            <article className="mm-stat">
              <div className="mm-stat-icon blue"><IndianRupee size={20} /></div>
              <div className="mm-stat-label">{t('maintenance.receivedThisMonth')}</div>
              <div className="mm-stat-value">{money(paymentsStats.totalReceivedThisMonth)}</div>
              <div className="mm-stat-note">{t('maintenance.currentMonthCollections')}</div>
            </article>
            <article className="mm-stat">
              <div className="mm-stat-icon red"><Wallet size={20} /></div>
              <div className="mm-stat-label">{t('maintenance.pendingCollection')}</div>
              <div className="mm-stat-value">{money(paymentsStats.pendingCollection)}</div>
              <div className="mm-stat-note">{t('maintenance.unpaidDuesTotal')}</div>
            </article>
          </div>

          <section className="mm-panel mm-table-panel" style={{ padding: '0', overflow: 'visible' }}>
            <div className="mm-panel-head" style={{ padding: '19px 19px 12px' }}>
              <div>
                <h2>{t('maintenance.paymentVerification')}</h2>
                <p>{t('maintenance.paymentVerificationSubtitle')}</p>
              </div>
              <div className="mm-head-actions">
                <button className="mm-button mm-button-light" onClick={printPaymentsReport}><Eye size={17} /> {t('maintenance.printReport')}</button>
                <button className="mm-button mm-button-light" onClick={exportPaymentsExcel}><Download size={17} /> {t('maintenance.exportExcel')}</button>
                <button className="mm-button mm-button-light" onClick={exportPaymentsCsv}><Download size={17} /> {t('maintenance.exportCsv')}</button>
              </div>
            </div>

            <div className="mm-table-wrap">
              <table className="mm-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={allPendingSelected}
                        onChange={toggleSelectAllPending}
                        disabled={!pendingPayments.length}
                      />
                    </th>
                    <th>{t('common.resident')}</th>
                    <th>{t('maintenance.flatNoColumn')}</th>
                    <th>{t('maintenance.billNumber')}</th>
                    <th>{t('maintenance.billMonth')}</th>
                    <th>{t('common.amount')}</th>
                    <th>{t('maintenance.paymentMethod')}</th>
                    <th>{t('maintenance.paymentDate')}</th>
                    <th>{t('maintenance.utrNumber')}</th>
                    <th>{t('maintenance.screenshotDocument')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('maintenance.submittedDate')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((payment) => {
                    const proofPath = paymentProofPath(payment);
                    const proofUrl = paymentProofUrl(payment);
                    const proofBroken = brokenProofs[payment.id];
                    const currentPaymentStatus = payment.original_payment_status || payment.payment_status;
                    const isPending = isPendingPaymentStatus(currentPaymentStatus);
                    
                    return (
                      <tr key={payment.id} style={{ background: selectedPaymentIds.has(payment.payment_id) ? 'var(--blue-soft)' : 'transparent' }}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={selectedPaymentIds.has(payment.payment_id)}
                            onChange={() => toggleSelectPayment(payment.payment_id)}
                            disabled={!isPending}
                          />
                        </td>
                        <td>
                          <strong>{payment.resident_name}</strong>
                          <small>Reg: {date(payment.created_at, i18n.language)}</small>
                        </td>
                        <td>{t('common.flat')} {payment.flat_no}</td>
                        <td>{payment.bill_number || `BILL-${payment.bill_id}`}</td>
                        <td>{translateMonth(Number(payment.month) || 1)} {payment.year}</td>
                        <td><strong>{money(payment.amount)}</strong></td>
                        <td>{payment.payment_method}</td>
                        <td>{date(payment.paid_at, i18n.language)}</td>
                        <td className="font-mono text-xs">{payment.utr_number || payment.transaction_id}</td>
                        <td>
                          {proofPath && !proofBroken ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingScreenshot({ ...payment, proofUrl });
                                  setZoomScale(1);
                                  setLoadingScreenshot(true);
                                }}
                                style={{ border: 0, padding: 0, background: 'transparent', cursor: 'pointer' }}
                                title="Zoom Screenshot"
                              >
                                <img
                                  key={paymentProofKey(payment)}
                                  src={proofUrl}
                                  alt="Payment proof thumbnail"
                                  loading="lazy"
                                  style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--portal-line)', background: '#f8fafc', transition: 'transform 0.15s ease' }}
                                  onError={() => setBrokenProofs((current) => ({ ...current, [payment.id]: true }))}
                               />
                              </button>
                            </div>
                          ) : proofPath && proofBroken ? (
                            <span className="text-xs text-red-500 font-semibold">{t('maintenance.brokenLink', 'Broken link')}</span>
                          ) : (
                            <span className="text-xs text-slate-400">{t('maintenance.noProof', 'No proof')}</span>
                          )}
                        </td>
                        <td>
                          <span className={statusClass(currentPaymentStatus)}>
                            {statusLabel(currentPaymentStatus, t)}
                          </span>
                        </td>
                        <td>{date(payment.created_at, i18n.language)}</td>
                        <td style={{ position: 'relative' }}>
                          <div className="mm-action-dropdown-wrap">
                            <button
                              className="mm-mini-action"
                              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', fontWeight: '700', padding: '5px 10px', color: '#1e293b', gap: '4px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const payId = payment.payment_id || payment.id;
                                setActiveActionDropdown(activeActionDropdown === payId ? null : payId);
                              }}
                            >
                              Actions <ChevronDown size={12} />
                            </button>

                            {activeActionDropdown === (payment.payment_id || payment.id) && (
                              <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setActiveActionDropdown(null)} />
                                <div className="mm-action-dropdown-menu" style={{ zIndex: 100 }}>
                                  <button
                                    className="mm-action-dropdown-item"
                                    onClick={() => {
                                      setActiveActionDropdown(null);
                                      setViewingDetails(payment);
                                    }}
                                  >
                                    <Eye size={13} /> {t('common.details', 'View Details')}
                                  </button>

                                  <button
                                    className="mm-action-dropdown-item"
                                    onClick={() => {
                                      setActiveActionDropdown(null);
                                      handlePrintBill(payment);
                                    }}
                                  >
                                    <FileText size={13} /> {t('common.viewBill', 'View Bill')}
                                  </button>

                                  {receiptAvailable(currentPaymentStatus) && (
                                    <button
                                      className="mm-action-dropdown-item"
                                      onClick={() => {
                                        setActiveActionDropdown(null);
                                        handlePrintReceipt(payment);
                                      }}
                                    >
                                      <Printer size={13} /> {t('common.printReceipt', 'Print Receipt')}
                                    </button>
                                  )}

                                  {isPending && (
                                    <>
                                      <div className="mm-action-dropdown-divider" />
                                      <button
                                        className="mm-action-dropdown-item green"
                                        onClick={() => {
                                          setActiveActionDropdown(null);
                                          handleApprovePayment(payment);
                                        }}
                                        disabled={saving}
                                      >
                                        <CheckCircle2 size={13} /> {t('common.approve', 'Approve Payment')}
                                      </button>
                                      <button
                                        className="mm-action-dropdown-item red"
                                        onClick={() => {
                                          setActiveActionDropdown(null);
                                          setRejectingPayment(payment);
                                          setRejectionType('Invalid Screenshot');
                                          setCustomRejectionReason('');
                                        }}
                                        disabled={saving}
                                      >
                                        <X size={13} /> {t('common.reject', 'Reject Payment')}
                                      </button>
                                    </>
                                  )}

                                  {String(currentPaymentStatus).toUpperCase() === 'REJECTED' && (
                                    <>
                                      <div className="mm-action-dropdown-divider" />
                                      <button
                                        className="mm-action-dropdown-item green"
                                        onClick={() => {
                                          setActiveActionDropdown(null);
                                          handleApprovePayment(payment);
                                        }}
                                        disabled={saving}
                                      >
                                        <CheckCircle2 size={13} /> Approve Payment
                                      </button>
                                      <button
                                        className="mm-action-dropdown-item red"
                                        onClick={() => {
                                          setActiveActionDropdown(null);
                                          handleReconsiderPayment(payment);
                                        }}
                                        disabled={saving}
                                      >
                                        <RefreshCcw size={13} /> {t('common.reconsider', 'Reconsider')}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!filteredPayments.length && (
                  <Empty 
                    title={t('maintenance.noPaymentsFound')} 
                    copy={t('maintenance.noPaymentsSubtitle')} 
                  />
                )}
              </div>

              {filteredPayments.length > 0 && (
                <div className="mm-pagination">
                  <div className="mm-pagination-info">
                    {t('common.showing', 'Showing')} {(currentPage - 1) * rowsPerPage + 1}–{Math.min(filteredPayments.length, currentPage * rowsPerPage)} {t('common.of', 'of')} {filteredPayments.length} {t('maintenance.payments')}
                  </div>
                  <div className="mm-pagination-controls">
                    <button
                      className="mm-pagination-page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                    >
                      {t('pagination.first')}
                    </button>
                    <button
                      className="mm-pagination-page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      {t('pagination.previous')}
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => {
                      const pNum = i + 1;
                      if (pNum === 1 || pNum === totalPages || Math.abs(currentPage - pNum) <= 1) {
                        return (
                          <button
                            key={pNum}
                            className={`mm-pagination-page-btn ${currentPage === pNum ? 'active' : ''}`}
                            onClick={() => setCurrentPage(pNum)}
                          >
                            {pNum}
                          </button>
                        );
                      }
                      if (pNum === 2 || pNum === totalPages - 1) {
                        return <span key={pNum} style={{ padding: '0 4px', fontSize: '10px' }}>...</span>;
                      }
                      return null;
                    })}
                    <button
                      className="mm-pagination-page-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                      {t('pagination.next')}
                    </button>
                    <button
                      className="mm-pagination-page-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      {t('pagination.last')}
                    </button>
                  </div>
                  <div className="mm-pagination-limit">
                    <span>{t('pagination.rowsPerPage')}</span>
                    <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              )}
            </section>
          </>
      ) : tab === 'expenses' ? (
        <section className="mm-panel mm-table-panel">
          <div className="mm-panel-head"><div><h2>{t('maintenance.expensesTitle')}</h2><p>{t('maintenance.expensesSubtitle')}</p></div><button className="mm-button mm-button-primary" onClick={() => setModal('expense')}><Plus size={17} /> {t('maintenance.recordExpense')}</button></div>
          <div className="mm-expense-summary"><div><span>{t('maintenance.currentMonthSpend')}</span><strong>{money(expenseSummary.currentMonthSpend)}</strong></div><div><span>{t('maintenance.transactions')}</span><strong>{expenseSummary.transactions}</strong></div><div><span>{t('maintenance.pendingApproval')}</span><strong>{expenseSummary.pendingApproval}</strong></div></div>
          <div className="mm-table-wrap"><table className="mm-table"><thead><tr><th>{t('maintenance.expenseHeader')}</th><th>{t('maintenance.category')}</th><th>{t('maintenance.vendor')}</th><th>{t('maintenance.paymentDate')}</th><th>{t('common.amount')}</th><th>{t('common.status')}</th><th>{t('maintenance.action')}</th></tr></thead>
            <tbody>{expenses.map((item) => <tr key={item.id}><td><strong>{item.expense_number}</strong><small>{item.description || t('maintenance.expensesTitle')}</small></td><td>{item.category}</td><td>{item.vendor}</td><td>{date(item.expense_date, i18n.language)}</td><td><strong>{money(item.amount)}</strong></td><td><span className={statusClass(item.status)}>{statusLabel(item.status, t)}</span></td><td><button className="mm-delete-expense-btn" disabled={deletingExpenseId === item.id} onClick={() => setDeletingExpense(item)}>{deletingExpenseId === item.id ? <RefreshCcw className="spin" size={13} /> : <Trash2 size={13} />} {t('common.delete', 'Delete')}</button></td></tr>)}</tbody>
          </table>{!expenses.length && <Empty title={t('maintenance.noExpenses')} copy={t('maintenance.noExpensesSubtitle')} />}</div>
        </section>
      ) : (
        <section className="mm-panel">
          <div className="mm-panel-head"><div><h2>{t('maintenance.reportsExports')}</h2><p>{t('maintenance.reportsSubtitle')}</p></div><button className="mm-button mm-button-light" onClick={exportCurrentView}><Download size={17} /> {t('maintenance.exportAllCsv')}</button></div>
          <div className="mm-report-grid">{[
            ['Monthly collection', t('maintenance.monthlyCollection'), t('maintenance.monthlyCollectionCopy'), TrendingUp],
            ['Pending dues', t('maintenance.pendingDues'), t('maintenance.pendingDuesCopy'), AlertCircle],
            ['Expense report', t('maintenance.expenseReport'), t('maintenance.expenseReportCopy'), Wallet],
            ['Income statement', t('maintenance.incomeStatement'), t('maintenance.incomeStatementCopy'), FileText]
          ].map(([key, name, copy, Icon]) => <button key={key} onClick={() => exportReport(key)}><span><Icon size={20} /></span><strong>{name}</strong><small>{copy}</small><Download size={17} /></button>)}</div>
        </section>
      )}

      {modal === 'manual_bill' && (
        <Modal title="Create Manual Bill" subtitle="Create an individual maintenance bill for a specific resident." onClose={() => setModal(null)}>
          <form onSubmit={submitManualBill} className="mm-form">
            {manualError && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 mb-4 text-xs flex items-center gap-2" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{manualError}</span>
              </div>
            )}

            <div className="mm-form-row">
              <label className="mm-field" style={{ gridColumn: '1 / -1' }}>
                <span>Resident *</span>
                <select value={manualBillForm.residentId} onChange={(e) => handleManualResidentChange(e.target.value)} required>
                  <option value="">-- Select Resident --</option>
                  {manualResidents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.email}) {r.flat_no ? `— Flat ${r.flat_no}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {manualBillForm.residentId && manualBillForm.flatNo && (
              <div className="mb-3 p-2.5 rounded-md bg-blue-50 text-blue-800 text-xs flex items-center justify-between" style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                <span>Assigned Flat: <strong>Flat {manualBillForm.flatNo}</strong> {manualBillForm.wing ? `(Wing ${manualBillForm.wing})` : ''}</span>
              </div>
            )}

            <div className="mm-form-row">
              <label className="mm-field">
                <span>Billing Month *</span>
                <select value={manualBillForm.month} onChange={(e) => setManualBillForm({ ...manualBillForm, month: Number(e.target.value) })}>
                  {months.map((month, index) => (
                    <option value={index + 1} key={month}>{month}</option>
                  ))}
                </select>
              </label>
              <label className="mm-field">
                <span>Billing Year *</span>
                <input type="number" min="2020" max="2099" value={manualBillForm.year} onChange={(e) => setManualBillForm({ ...manualBillForm, year: Number(e.target.value) })} required />
              </label>
            </div>

            <div className="mm-form-row">
              <label className="mm-field">
                <span>Optional Charges (₹)</span>
                <input type="number" min="0" step="any" placeholder="e.g. 200 (extra/penalty)" value={manualBillForm.optionalCharges} onChange={(e) => setManualBillForm({ ...manualBillForm, optionalCharges: e.target.value })} />
              </label>
            </div>

            <div className="mm-form-row">
              <label className="mm-field">
                <span>Due Date *</span>
                <input type="date" value={manualBillForm.dueDate} onChange={(e) => setManualBillForm({ ...manualBillForm, dueDate: e.target.value })} required />
              </label>
              <label className="mm-field">
                <span>Bill Title</span>
                <input type="text" placeholder="e.g. Monthly Maintenance" value={manualBillForm.title} onChange={(e) => setManualBillForm({ ...manualBillForm, title: e.target.value })} />
              </label>
            </div>

            <div className="mm-form-row">
              <label className="mm-field" style={{ gridColumn: '1 / -1' }}>
                <span>Notes / Remarks (Optional)</span>
                <textarea rows="2" placeholder="Optional details or breakdown notes..." value={manualBillForm.notes} onChange={(e) => setManualBillForm({ ...manualBillForm, notes: e.target.value })} />
              </label>
            </div>

            <div className="p-3 my-2 rounded-lg bg-slate-100 flex items-center justify-between" style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px', margin: '8px 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#475467' }}>Total Bill Amount:</span>
              <strong style={{ fontSize: '18px', color: '#0284c7' }}>{money((Number(manualBillForm.amount) || 0) + (Number(manualBillForm.optionalCharges) || 0))}</strong>
            </div>

            {manualError && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 mb-4 text-xs flex items-center gap-2" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{manualError}</span>
              </div>
            )}

            <div className="mm-form-actions">
              <button type="button" className="mm-button mm-button-light" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
              <button type="submit" className="mm-button mm-button-primary" disabled={saving}>{saving ? 'Creating Bill...' : 'Create Manual Bill'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'generate' && (
        <Modal title="Generate Monthly Bills" subtitle="Generate a billing record for all assigned resident flats automatically." onClose={() => setModal(null)}>
          <form onSubmit={submitCycle} className="mm-form">
            {settings ? (
              <>
                {getCycleGenerationInfo(cycleForm.month, cycleForm.year).count > 0 && !validateGenerationCycle() && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-3 mb-4 text-xs flex items-center gap-2" style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} />
                    <span>Note: {getCycleGenerationInfo(cycleForm.month, cycleForm.year).count} resident(s) already have a bill for {months[cycleForm.month - 1]} {cycleForm.year}. Generating will automatically skip existing ones and create bills for all remaining residents.</span>
                  </div>
                )}
                {validateGenerationCycle() && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-3 mb-4 text-xs flex items-center gap-2" style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} />
                    <span>{validateGenerationCycle()}</span>
                  </div>
                )}
                <div className="mm-form-row">
                  <label className="mm-field">
                    <span>Billing Month</span>
                    <select value={cycleForm.month} onChange={(e) => setCycleForm({ ...cycleForm, month: Number(e.target.value) })}>
                      {months.map((month, index) => {
                        const monthVal = index + 1;
                        return (
                          <option value={monthVal} key={month}>
                            {month}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="mm-field">
                    <span>Billing Year</span>
                    <input type="number" min="2020" value={cycleForm.year} onChange={(e) => setCycleForm({ ...cycleForm, year: Number(e.target.value) })} />
                  </label>
                </div>
                <div className="mm-form-actions">
                  <button type="button" className="mm-button mm-button-light" onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="mm-button mm-button-primary" disabled={saving || Boolean(validateGenerationCycle())}>
                    {saving ? <RefreshCcw className="spin" size={17} /> : <CalendarDays size={17} />}
                    Generate Bills
                  </button>
                </div>
              </>
            ) : (
              <div className="p-4 text-center">
                <AlertCircle size={30} className="mx-auto text-amber-500 mb-2" />
                <p className="font-semibold text-slate-800 text-sm">No maintenance rules configured</p>
                <p className="text-xs text-slate-500 mb-4">Please set the monthly maintenance rule first in the Settings tab.</p>
                <button type="button" className="mm-button mm-button-primary mx-auto" onClick={() => { setModal(null); setTab('settings'); }}>Go to Settings</button>
              </div>
            )}
          </form>
        </Modal>
      )}

      {modal === 'expense' && <Modal title="Record expense" subtitle="Add a society maintenance expense or vendor payment." onClose={() => setModal(null)}>
        <form onSubmit={submitExpense} className="mm-form">
          <div className="mm-form-row"><label className="mm-field"><span>Category</span><select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>{['Security Salary', 'Lift Service', 'Electricity', 'Water', 'Cleaning', 'Garden', 'Repairs', 'Painting', 'Fire Safety', 'Generator', 'Others'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="mm-field"><span>Expense date</span><input type="date" required value={expenseForm.expenseDate} onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} /></label></div>
          <label className="mm-field mm-field-full"><span>Vendor</span><input required value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} placeholder="Vendor or service provider" /></label>
          <div className="mm-form-row"><label className="mm-field"><span>Amount</span><input type="number" min="1" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></label><label className="mm-field"><span>Payment method</span><select value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}><option>Bank Transfer</option><option>UPI</option><option>Cheque</option><option>Cash</option></select></label></div>
          <label className="mm-field mm-field-full"><span>Description</span><textarea rows="3" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} /></label>
          <div className="mm-form-actions"><button type="button" className="mm-button mm-button-light" onClick={() => setModal(null)}>Cancel</button><button className="mm-button mm-button-primary" disabled={saving}>Record expense</button></div>
        </form>
      </Modal>}

      {modal === 'writeoff' && writeOffBill && (
        <Modal
          title="Maintenance Write-off"
          subtitle={`${writeOffBill.resident_name || 'Resident'} · Flat ${writeOffBill.flat_no || ''}`}
          onClose={() => { if (!saving) { setModal(null); setWriteOffBill(null); } }}
        >
          {(() => {
            const currentDue = Number(writeOffBill.remaining_due ?? writeOffBill.current_due ?? writeOffBill.remaining_amount ?? 0);
            const totalBill = Number(writeOffBill.total_amount || writeOffBill.amount || 0);
            const maxAllowed = currentDue > 0 ? currentDue : totalBill;
            const typedAmount = Number(writeOffForm.amount || 0);
            const writeOffAmount = writeOffForm.writeoffType === 'TOTAL' ? maxAllowed : typedAmount;
            const finalDue = Math.max(0, currentDue - writeOffAmount);
            const canSubmit = writeOffAmount > 0 && writeOffAmount <= maxAllowed;
            return (
              <form onSubmit={submitWriteOff} className="mm-form p-4">
                <div className="rounded-lg p-4 mb-3 border text-sm" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ marginBottom: 6 }}><strong>Original Amount:</strong> {money(writeOffBill.original_amount || writeOffBill.amount)}</div>
                  <div style={{ marginBottom: 6 }}><strong>Penalty:</strong> {money(writeOffBill.penalty_amount || writeOffBill.late_fee)}</div>
                  <div style={{ marginBottom: 6 }}><strong>Paid:</strong> {money(writeOffBill.paid_amount)}</div>
                  <div><strong>Current Due:</strong> {money(currentDue)}</div>
                </div>

                {currentDue === 0 && (
                  <div style={{ padding: '8px 12px', marginBottom: '12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', color: '#b45309' }}>
                    Note: This bill is marked as Paid (Current Due: ₹0). Applying a write-off will adjust the bill record.
                  </div>
                )}

                <label className="mm-field mm-field-full">
                  <span>Write-off Type</span>
                  <select value={writeOffForm.writeoffType} onChange={(e) => setWriteOffForm({ ...writeOffForm, writeoffType: e.target.value, amount: '' })}>
                    <option value="PARTIAL">Partial write-off</option>
                    <option value="TOTAL">Total write-off</option>
                  </select>
                </label>

                {writeOffForm.writeoffType === 'PARTIAL' && (
                  <label className="mm-field mm-field-full">
                    <span>Write-off Amount</span>
                    <input type="number" min="1" max={maxAllowed} required value={writeOffForm.amount} onChange={(e) => setWriteOffForm({ ...writeOffForm, amount: e.target.value })} />
                  </label>
                )}

                <label className="mm-field mm-field-full">
                  <span>Reason</span>
                  <select value={writeOffForm.reason} onChange={(e) => setWriteOffForm({ ...writeOffForm, reason: e.target.value })}>
                    {['Billing Error', 'Society Decision', 'Financial Assistance', 'Management Approval', 'Other'].map((reason) => <option key={reason}>{reason}</option>)}
                  </select>
                </label>

                <label className="mm-field mm-field-full">
                  <span>Admin Remarks (optional)</span>
                  <textarea rows="2" value={writeOffForm.remarks} onChange={(e) => setWriteOffForm({ ...writeOffForm, remarks: e.target.value })} placeholder="Internal note for audit trail. Residents will not see this." />
                </label>

                <div className="rounded-lg p-3 border text-sm" style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                  <div style={{ marginBottom: 4 }}><strong>Write-off Amount:</strong> {money(writeOffAmount)}</div>
                  <div><strong>Final Due:</strong> {money(finalDue)}</div>
                </div>

                <div className="mm-form-actions" style={{ marginTop: '12px', paddingBottom: '8px' }}>
                  <button type="button" className="mm-button mm-button-light" disabled={saving} onClick={() => { setModal(null); setWriteOffBill(null); }}>Cancel</button>
                  <button type="submit" className="mm-button mm-button-primary" disabled={saving || !canSubmit}>{saving ? 'Saving...' : 'Apply Write-off'}</button>
                </div>
              </form>
            );
          })()}
        </Modal>
      )}

      {modal === 'edit_bill' && editingBill && (
        <Modal 
          title="Edit Maintenance Bill" 
          subtitle={`${editingBill.resident_name || 'Resident'} · Flat ${editingBill.flat_no || ''}`} 
          onClose={() => { setModal(null); setEditingBill(null); }}
        >
          <form onSubmit={submitEditBill} className="mm-form p-4">
            <div className="rounded-lg p-4 mb-4 border text-sm" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px' }}><strong>Billing Cycle:</strong> {months[(Number(editingBill.month) || 1) - 1]} {editingBill.year}</div>
              <div style={{ marginBottom: '8px' }}><strong>Flat Type:</strong> {editingBill.flat_type_name || 'Not Assigned'}</div>
              <div style={{ marginBottom: '8px' }}><strong>Default Base Amount:</strong> {money(editingBill.default_maintenance_amount)}</div>
              {editingBill.is_custom_amount && (
                <div style={{ color: '#d97706', fontWeight: '600', marginTop: '4px' }}>
                  * This bill currently uses a custom overridden amount.
                </div>
              )}
            </div>
            
            <label className="mm-field mm-field-full" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Maintenance Base Amount (₹)</span>
              <input 
                type="number" 
                min="0" 
                required 
                value={editBillForm.amount} 
                onChange={(e) => setEditBillForm({ ...editBillForm, amount: e.target.value })} 
                placeholder="e.g. 2500" 
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </label>

            <label className="mm-field mm-field-full" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Reason for Override (Optional)</span>
              <textarea 
                rows="3" 
                value={editBillForm.reason} 
                onChange={(e) => setEditBillForm({ ...editBillForm, reason: e.target.value })} 
                placeholder="Explain why this unit's maintenance amount is being customized." 
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </label>

            <div className="mm-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="button" className="mm-button mm-button-light" onClick={() => { setModal(null); setEditingBill(null); }} style={{ padding: '8px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" className="mm-button mm-button-primary" disabled={saving} style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'write_off' && writeOffBill && (
        <Modal
          title="Apply Maintenance Write-Off"
          subtitle={`${writeOffBill.resident_name || 'Resident'} · Flat ${writeOffBill.flat_no || ''}`}
          onClose={() => { setModal(null); setWriteOffBill(null); }}
        >
          <form onSubmit={submitWriteOff} className="mm-form p-4">
            <div className="rounded-lg p-4 mb-4 border text-sm" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px' }}><strong>Billing Period:</strong> {months[(Number(writeOffBill.month) || 1) - 1]} {writeOffBill.year}</div>
              <div style={{ marginBottom: '8px' }}><strong>Original Total:</strong> {money(writeOffBill.total_amount)}</div>
              <div style={{ marginBottom: '8px' }}><strong>Remaining Payable:</strong> {money(writeOffBill.remaining_amount)}</div>
            </div>

            <label className="mm-field mm-field-full" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Write-Off Type</span>
              <select
                value={writeOffForm.type}
                onChange={(e) => setWriteOffForm({ ...writeOffForm, type: e.target.value, amount: e.target.value === 'Full' ? String(writeOffBill.remaining_amount) : '' })}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option value="Maintenance">Maintenance Write-Off</option>
                <option value="Penalty">Penalty Write-Off</option>
                <option value="Full">Full Write-Off</option>
              </select>
            </label>

            {writeOffForm.type !== 'Full' ? (
              <label className="mm-field mm-field-full" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Write-Off Amount (₹)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={writeOffForm.amount}
                  onChange={(e) => setWriteOffForm({ ...writeOffForm, amount: e.target.value })}
                  placeholder="e.g. 500"
                  style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </label>
            ) : (
              <div className="p-3 mb-3 border rounded text-slate-600 bg-slate-50 text-xs font-semibold" style={{ marginBottom: '16px' }}>
                Will write off the entire remaining payable amount of {money(writeOffBill.remaining_amount)}.
              </div>
            )}

            <label className="mm-field mm-field-full" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Write-Off Reason (Mandatory)</span>
              <textarea
                rows="3"
                required
                value={writeOffForm.reason}
                onChange={(e) => setWriteOffForm({ ...writeOffForm, reason: e.target.value })}
                placeholder="Specify the reason for this write-off (e.g., Committee approval, late fee waiver, resident dispute resolved)."
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </label>

            <div className="mm-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="button" className="mm-button mm-button-light" onClick={() => { setModal(null); setWriteOffBill(null); }} style={{ padding: '8px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" className="mm-button mm-button-primary" disabled={saving} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {saving ? 'Approving...' : 'Confirm Write-Off'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deletingExpense && (
        <Modal
          title="Delete Expense"
          subtitle="Are you sure you want to permanently delete this expense? This action cannot be undone."
          onClose={() => {
            if (!deletingExpenseId) setDeletingExpense(null);
          }}
        >
          <div className="mm-form">
            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-800">
              <strong>{deletingExpense.expense_number}</strong>
              <p style={{ margin: '5px 0 0', fontSize: 12 }}>{deletingExpense.description || deletingExpense.vendor || 'Maintenance expense'} · {money(deletingExpense.amount)}</p>
            </div>
            <div className="mm-form-actions">
              <button type="button" className="mm-button mm-button-light" disabled={Boolean(deletingExpenseId)} onClick={() => setDeletingExpense(null)}>Cancel</button>
              <button type="button" className="mm-button mm-button-danger" disabled={Boolean(deletingExpenseId)} onClick={confirmDeleteExpense}>
                {deletingExpenseId ? <RefreshCcw className="spin" size={17} /> : <Trash2 size={17} />}
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {rejectingPayment && (
        <Modal
          title="Reject Payment"
          subtitle={`${rejectingPayment.resident_name || 'Resident'} · ${rejectingPayment.bill_number || `BILL-${rejectingPayment.bill_id}`}`}
          onClose={() => {
            if (!saving) {
              setRejectingPayment(null);
              setRejectionType('Invalid Screenshot');
              setCustomRejectionReason('');
            }
          }}
        >
          <form onSubmit={submitRejectionForm} className="mm-form">
            <div className="rounded-lg bg-red-50 border border-red-100 text-red-700 p-3 text-xs font-semibold">
              This will mark the selected payment as rejected, return bills to Overdue, and notify residents.
            </div>
            
            <label className="mm-field mm-field-full">
              <span>Select Rejection Reason (Mandatory)</span>
              <select 
                value={rejectionType} 
                onChange={(e) => setRejectionType(e.target.value)}
                required
              >
                <option value="Payment screenshot is blurry">Payment screenshot is blurry</option>
                <option value="Wrong payment amount">Wrong payment amount</option>
                <option value="Payment not received">Payment not received</option>
                <option value="Wrong transaction ID">Wrong transaction ID</option>
                <option value="Duplicate payment">Duplicate payment</option>
                <option value="Other">Other (with custom text)</option>
              </select>
            </label>

            {rejectionType === 'Other' && (
              <label className="mm-field mm-field-full">
                <span>Custom Rejection Reason</span>
                <textarea
                  rows="4"
                  required
                  value={customRejectionReason}
                  onChange={(event) => setCustomRejectionReason(event.target.value)}
                  placeholder="Example: Payment screenshot is unclear. Please upload a clear payment proof."
                />
              </label>
            )}

            <div className="mm-form-actions">
              <button 
                type="button" 
                className="mm-button mm-button-light" 
                disabled={saving} 
                onClick={() => { 
                  setRejectingPayment(null); 
                  setRejectionType('Invalid Screenshot'); 
                  setCustomRejectionReason(''); 
                }}
              >
                Cancel
              </button>
              <button 
                className="mm-button mm-button-danger" 
                disabled={saving || (rejectionType === 'Other' && !customRejectionReason.trim())}
              >
                {saving ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewingScreenshot && (
        <Modal
          wide
          title="Payment Screenshot Proof"
          subtitle={`${viewingScreenshot.resident_name || 'Resident'} · ${viewingScreenshot.bill_number || `BILL-${viewingScreenshot.bill_id}`}`}
          onClose={() => setViewingScreenshot(null)}
        >
          <div style={{ padding: '18px 20px', background: '#f8fafc' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
              <div><span className="text-xs text-slate-500">Flat</span><strong style={{ display: 'block' }}>{viewingScreenshot.flat_no || '-'}</strong></div>
              <div><span className="text-xs text-slate-500">UTR / Ref</span><strong style={{ display: 'block' }}>{viewingScreenshot.utr_number || viewingScreenshot.transaction_id || '-'}</strong></div>
              <div><span className="text-xs text-slate-500">Amount</span><strong style={{ display: 'block' }}>{money(viewingScreenshot.amount)}</strong></div>
              <div><span className="text-xs text-slate-500">Payment Date</span><strong style={{ display: 'block' }}>{date(viewingScreenshot.paid_at)}</strong></div>
            </div>

            <div className="mm-zoom-container">
              {brokenProofs[viewingScreenshot.id] ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>
                  <Image size={32} style={{ margin: '0 auto 10px' }} />
                  <strong>Screenshot could not be loaded.</strong>
                  <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 12 }}>The image path is missing or broken.</p>
                </div>
              ) : (
                <>
                  {loadingScreenshot && (
                    <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
                      <RefreshCcw className="spin" size={20} /> Loading Image...
                    </div>
                  )}
                  <div className="mm-zoom-viewport">
                    <img
                      key={paymentProofKey(viewingScreenshot)}
                      src={viewingScreenshot.proofUrl}
                      alt="Full proof"
                      className="mm-zoom-img"
                      style={{ transform: `scale(${zoomScale})` }}
                      onLoad={() => setLoadingScreenshot(false)}
                      onError={() => setBrokenProofs((current) => ({ ...current, [viewingScreenshot.id]: true }))}
                    />
                  </div>
                  <div className="mm-zoom-controls">
                    <button className="mm-zoom-btn" onClick={() => setZoomScale(z => Math.max(0.5, z - 0.25))}>- Zoom Out</button>
                    <button className="mm-zoom-btn" onClick={() => setZoomScale(1)}>Reset ({Math.round(zoomScale * 100)}%)</button>
                    <button className="mm-zoom-btn" onClick={() => setZoomScale(z => Math.min(3, z + 0.25))}>+ Zoom In</button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mm-form-actions" style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {viewingScreenshot.proofUrl && !brokenProofs[viewingScreenshot.id] && (
              <button 
                className="mm-button mm-button-primary"
                onClick={() => downloadScreenshot(viewingScreenshot.proofUrl, `proof-${viewingScreenshot.utr_number || viewingScreenshot.id}.jpg`)}
              >
                <Download size={14} /> Download Proof
              </button>
            )}
            <button className="mm-button mm-button-light" onClick={() => setViewingScreenshot(null)}>Close</button>
          </div>
        </Modal>
      )}

      {viewingDetails && (
        <Modal
          wide
          title="Payment Request Details"
          subtitle={`Payment ID: #${viewingDetails.payment_id || viewingDetails.id}`}
          onClose={() => setViewingDetails(null)}
        >
          <div className="mm-details-grid">
            <div className="mm-details-item">
              <span className="mm-details-label">Resident</span>
              <span className="mm-details-value">{viewingDetails.resident_name}</span>
            </div>
            <div className="mm-details-item">
              <span className="mm-details-label">Flat No.</span>
              <span className="mm-details-value">Flat {viewingDetails.flat_no}</span>
            </div>
            <div className="mm-details-item">
              <span className="mm-details-label">Bill Number</span>
              <span className="mm-details-value">{viewingDetails.bill_number || `BILL-${viewingDetails.bill_id}`}</span>
            </div>
            <div className="mm-details-item">
              <span className="mm-details-label">Bill Month</span>
              <span className="mm-details-value">{months[(Number(viewingDetails.month) || 1) - 1]} {viewingDetails.year}</span>
            </div>
            <div className="mm-details-item">
              <span className="mm-details-label">Amount Paid</span>
              <span className="mm-details-value">{money(viewingDetails.amount)}</span>
            </div>
            <div className="mm-details-item">
              <span className="mm-details-label">Payment Method</span>
              <span className="mm-details-value">{viewingDetails.payment_method || 'UPI'}</span>
            </div>
            <div className="mm-details-item">
              <span className="mm-details-label">UTR Number</span>
              <span className="mm-details-value">{viewingDetails.utr_number || viewingDetails.transaction_id}</span>
            </div>
            <div className="mm-details-item">
              <span className="mm-details-label">Payment Date</span>
              <span className="mm-details-value">{date(viewingDetails.paid_at)}</span>
            </div>
            <div className="mm-details-item">
              <span className="mm-details-label">Submission Date</span>
              <span className="mm-details-value">{new Date(viewingDetails.created_at).toLocaleString('en-IN')}</span>
            </div>
            <div className="mm-details-item">
              <span className="mm-details-label">Admin Status</span>
              <span className="mm-details-value">
                <span className={statusClass(viewingDetails.original_payment_status || viewingDetails.payment_status)}>
                  {viewingDetails.original_payment_status || viewingDetails.payment_status}
                </span>
              </span>
            </div>
            <div className="mm-details-item" style={{ gridColumn: '1 / -1' }}>
              <span className="mm-details-label">Admin Remarks / Rejection Reason</span>
              <span className="mm-details-value" style={{ fontWeight: 'normal', color: '#475467' }}>
                {viewingDetails.remarks || viewingDetails.rejection_reason || '—'}
              </span>
            </div>
            {(viewingDetails.verified_at || viewingDetails.rejected_at) && (
              <div className="mm-details-item" style={{ gridColumn: '1 / -1' }}>
                <span className="mm-details-label">Action Date & Time</span>
                <span className="mm-details-value">
                  {new Date(viewingDetails.verified_at || viewingDetails.rejected_at).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
          
          <div style={{ padding: '20px', background: '#ffffff', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ fontWeight: '600', fontSize: '12px', color: '#64748b' }}>Screenshot Proof:</div>
            {paymentProofPath(viewingDetails) ? (
              <button 
                className="mm-button mm-button-light"
                onClick={() => {
                  setViewingScreenshot({ ...viewingDetails, proofUrl: paymentProofUrl(viewingDetails) });
                  setViewingDetails(null);
                  setZoomScale(1);
                  setLoadingScreenshot(true);
                }}
              >
                <Eye size={14} /> Open Screenshot
              </button>
            ) : (
              <span className="text-xs text-slate-400">No screenshot uploaded</span>
            )}
          </div>
          
          <div className="mm-form-actions" style={{ padding: '0 20px 20px', gap: '8px' }}>
            <button 
              className="mm-button mm-button-primary" 
              style={{ background: 'linear-gradient(90deg, #1769e0, #2f86ee)' }}
              onClick={() => handlePrintBill(viewingDetails)}
            >
              <FileText size={14} /> View Maintenance Bill
            </button>
            <button className="mm-button mm-button-light" onClick={() => setViewingDetails(null)}>Close</button>
          </div>
        </Modal>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedPaymentIds.size > 0 && (
        <div className="mm-bulk-bar">
          <div className="mm-bulk-info">
            {selectedPaymentIds.size} pending payments selected
          </div>
          <div className="mm-bulk-actions">
            <button 
              className="mm-bulk-btn mm-bulk-btn-approve" 
              onClick={handleBulkApprove}
              disabled={saving}
            >
              Approve Selected
            </button>
            <button 
              className="mm-bulk-btn mm-bulk-btn-reject" 
              onClick={() => {
                setRejectingPayment({ id: 'bulk', resident_name: 'Selected Residents', bill_number: 'Multiple Bills' });
                setRejectionType('Invalid Screenshot');
                setCustomRejectionReason('');
              }}
              disabled={saving}
            >
              Reject Selected
            </button>
            <button 
              className="mm-bulk-btn mm-bulk-btn-export" 
              onClick={exportSelectedPayments}
            >
              Export Selected
            </button>
            <button 
              className="mm-bulk-btn mm-bulk-btn-cancel" 
              onClick={() => setSelectedPaymentIds(new Set())}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
