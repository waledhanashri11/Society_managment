import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, CalendarDays,
  CheckCircle2, ChevronDown, Download, FileBarChart, FileText, Printer,
  Eye, Filter, Image, IndianRupee, LayoutDashboard, Plus, ReceiptIndianRupee,
  RefreshCcw, Search, SlidersHorizontal, TrendingUp, Wallet,
  Trash2, X
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { maintenanceAPI, settingsAPI } from '../services/api';
import { printPaymentReceipt, receiptAvailable } from '../utils/paymentReceipt';
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
const cycleNumber = (year, month) => Number(year) * 12 + Number(month);
const backendOrigin = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '').replace(/\/$/, '');
const fileUrl = (value) => {
  if (!value) return '';
  const cleanValue = String(value).trim().replace(/\\/g, '/');
  if (/^(https?:|data:|blob:)/i.test(cleanValue)) return cleanValue;
  return `${backendOrigin}${cleanValue.startsWith('/') ? cleanValue : `/${cleanValue}`}`;
};
const paymentProofPath = (payment) => {
  if (payment?.screenshot_path && String(payment.screenshot_path).startsWith('/uploads/')) return payment.screenshot_path;
  return payment?.screenshot_url || payment?.screenshot || payment?.screenshot_path || payment?.payment_screenshot || '';
};
const paymentProofUrl = (payment) => fileUrl(paymentProofPath(payment));

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

  // Payment Verification States
  const [rejectionType, setRejectionType] = useState('Invalid Screenshot');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [selectedPaymentIds, setSelectedPaymentIds] = useState(new Set());
  const [viewingDetails, setViewingDetails] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [loadingScreenshot, setLoadingScreenshot] = useState(true);

  // Payments Filters States
  const [payFilterResident, setPayFilterResident] = useState('');
  const [payFilterBillNo, setPayFilterBillNo] = useState('');
  const [payFilterUTR, setPayFilterUTR] = useState('');
  const [payFilterStatus, setPayFilterStatus] = useState('All');
  const [payFilterMonth, setPayFilterMonth] = useState('All');
  const [payFilterDate, setPayFilterDate] = useState('');
  const [payFilterFlat, setPayFilterFlat] = useState('');

  // Payments Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const resetPaymentsFilters = () => {
    setPayFilterResident('');
    setPayFilterBillNo('');
    setPayFilterUTR('');
    setPayFilterStatus('All');
    setPayFilterMonth('All');
    setPayFilterDate('');
    setPayFilterFlat('');
  };
  const current = new Date();
  
  const [cycleForm, setCycleForm] = useState({ month: current.getMonth() + 1, year: current.getFullYear() });
  const [settingsForm, setSettingsForm] = useState({ title: 'Monthly Maintenance', fixed_amount: '', due_day: 10, late_fee_type: 'fixed', late_fee_value: '', grace_days: 2 });
  const [expenseForm, setExpenseForm] = useState({ category: 'Repairs', vendor: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: 'Bank Transfer', status: 'Paid', description: '' });
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
      maintenanceAPI.getSettings(), settingsAPI.getPayment()
    ];
    const results = await Promise.allSettled(requests);
    if (results[0].status === 'fulfilled') setBills(unwrap(results[0].value));
    if (results[1].status === 'fulfilled') setDashboard(unwrap(results[1].value, dashboard));
    if (results[3].status === 'fulfilled') setExpenses(unwrap(results[3].value));
    if (results[4].status === 'fulfilled') setPayments(unwrap(results[4].value));
    if (results[5].status === 'fulfilled') setSettings(unwrap(results[5].value, null));
    if (results[6].status === 'fulfilled') setPaymentSettings(results[6].value.data?.data ?? results[6].value.data ?? {});
    if (results.every((result) => result.status === 'rejected')) setError('The maintenance service is unavailable. Start the backend and refresh this page.');
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCurrentPage(1);
  }, [payFilterResident, payFilterBillNo, payFilterUTR, payFilterStatus, payFilterMonth, payFilterDate, payFilterFlat, rowsPerPage]);

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
    const generatedCycles = Array.from(
      new Set(
        billsList
          .filter((bill) => bill && bill.year && bill.month && bill.resident_id && bill.flat_id)
          .map((bill) => Number(bill.year) * 12 + Number(bill.month))
      )
    ).sort((a, b) => b - a);

    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;
    const nowCycle = nowYear * 12 + nowMonth;

    let nextCycle;
    if (!generatedCycles.length) {
      nextCycle = nowCycle;
    } else {
      nextCycle = generatedCycles[0] + 1;
    }

    const nextYear = Math.floor((nextCycle - 1) / 12);
    const nextMonth = nextCycle - (nextYear * 12);
    const isFuture = nextCycle > nowCycle;

    return {
      month: nextMonth,
      year: nextYear,
      cycle: nextCycle,
      isFuture,
      label: months[nextMonth - 1] ? `${months[nextMonth - 1]} ${nextYear}` : `${nextMonth} ${nextYear}`
    };
  }, [bills]);

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
    const pending = billsList.reduce((sum, bill) => sum + Number(bill?.remaining_amount || 0), 0);
    const overdue = billsList.reduce((sum, bill) => {
      const isOverdue = (bill?.payment_status || bill?.status) === 'Overdue';
      return sum + (isOverdue ? Number(bill?.remaining_amount || 0) : 0);
    }, 0);
    const totalAmount = collected + pending;
    const collectionPercentage = totalAmount ? Math.round((collected / totalAmount) * 100) : 0;
    return {
      collected,
      pending,
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

    // Filter by Resident Name
    if (payFilterResident.trim()) {
      const q = payFilterResident.toLowerCase();
      list = list.filter(p => (p.resident_name || '').toLowerCase().includes(q));
    }

    // Filter by Bill Number
    if (payFilterBillNo.trim()) {
      const q = payFilterBillNo.toLowerCase();
      list = list.filter(p => (p.bill_number || '').toLowerCase().includes(q));
    }

    // Filter by UTR Number
    if (payFilterUTR.trim()) {
      const q = payFilterUTR.toLowerCase();
      list = list.filter(p => (p.utr_number || p.transaction_id || '').toLowerCase().includes(q));
    }

    // Filter by Status (Pending, Approved, Rejected)
    if (payFilterStatus !== 'All') {
      list = list.filter(p => {
        const status = p.original_payment_status || p.payment_status;
        if (payFilterStatus === 'Pending') {
          return ['Pending', 'Pending Verification', 'Under Review'].includes(status);
        } else if (payFilterStatus === 'Approved') {
          return ['Approved', 'Paid'].includes(status);
        } else if (payFilterStatus === 'Rejected') {
          return status === 'Rejected';
        }
        return true;
      });
    }

    // Filter by Bill Month
    if (payFilterMonth !== 'All') {
      list = list.filter(p => Number(p.month) === Number(payFilterMonth));
    }

    // Filter by Payment Date (YYYY-MM-DD matches paid_at)
    if (payFilterDate) {
      list = list.filter(p => {
        if (!p.paid_at) return false;
        const pDate = new Date(p.paid_at).toISOString().split('T')[0];
        return pDate === payFilterDate;
      });
    }

    // Filter by Flat Number
    if (payFilterFlat.trim()) {
      const q = payFilterFlat.toLowerCase();
      list = list.filter(p => (p.flat_no || '').toLowerCase().includes(q));
    }

    // Sort: Pending payments should always appear at the top of the table by default.
    list.sort((a, b) => {
      const statusA = a.original_payment_status || a.payment_status;
      const statusB = b.original_payment_status || b.payment_status;
      const isPendingA = ['Pending', 'Pending Verification', 'Under Review'].includes(statusA);
      const isPendingB = ['Pending', 'Pending Verification', 'Under Review'].includes(statusB);

      if (isPendingA && !isPendingB) return -1;
      if (!isPendingA && isPendingB) return 1;

      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });

    return list;
  }, [paymentRows, payFilterResident, payFilterBillNo, payFilterUTR, payFilterStatus, payFilterMonth, payFilterDate, payFilterFlat]);

  const paymentsStats = useMemo(() => {
    const totalRequests = payments.length;
    const pendingVerification = payments.filter(p => ['Pending', 'Pending Verification', 'Under Review'].includes(p.payment_status)).length;
    const approvedPayments = payments.filter(p => ['Approved', 'Paid'].includes(p.payment_status)).length;
    const rejectedPayments = payments.filter(p => p.payment_status === 'Rejected').length;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const totalReceivedThisMonth = payments
      .filter(p => ['Approved', 'Paid'].includes(p.payment_status) && p.paid_at && new Date(p.paid_at).getMonth() === currentMonth && new Date(p.paid_at).getFullYear() === currentYear)
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
    return filteredPayments.filter(p => ['Pending', 'Pending Verification', 'Under Review'].includes(p.original_payment_status || p.payment_status));
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
        bucket.pending += Number(bill.remaining_amount || 0);
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
        remaining_amount: Number(bill.remaining_amount || 0),
        due_date: date(bill.due_date),
        status: bill.payment_status || bill.status || ''
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



  const validateGenerationCycle = () => {
    const billsList = Array.isArray(bills) ? bills : [];
    const generatedCycles = Array.from(
      new Set(
        billsList
          .filter((bill) => bill && bill.year && bill.month && bill.resident_id && bill.flat_id)
          .map((bill) => cycleNumber(bill.year, bill.month))
      )
    ).sort((a, b) => b - a);

    if (!cycleForm || !cycleForm.year || !cycleForm.month) {
      return 'Invalid selected month or year.';
    }

    const selectedCycle = cycleNumber(cycleForm.year, cycleForm.month);

    // Previous months are blocked only after the first bill exists.
    if (!generatedCycles.length) {
      return '';
    }

    const latestCycle = generatedCycles[0];
    const nextPendingCycle = latestCycle + 1;

    if (selectedCycle === nextPendingCycle) {
      return '';
    }

    if (selectedCycle < nextPendingCycle) {
      if (generatedCycles.includes(selectedCycle)) {
        const monthName = months[cycleForm.month - 1] || cycleForm.month;
        return `Maintenance bills for ${monthName} ${cycleForm.year} have already been generated.`;
      }
      return 'Previous months cannot be generated.';
    }

    if (selectedCycle > nextPendingCycle) {
      const nextPendingYear = Math.floor((nextPendingCycle - 1) / 12);
      const nextPendingMonth = nextPendingCycle - (nextPendingYear * 12);
      const nextPendingMonthName = months[nextPendingMonth - 1] || nextPendingMonth;
      return `${nextPendingMonthName} ${nextPendingYear} maintenance has not been generated yet. Please generate ${nextPendingMonthName} first.`;
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
    { label: 'Total Collected', value: money(calculatedStats.collected), note: 'Accumulated payments', icon: IndianRupee, tone: 'blue', up: true },
    { label: 'Total Pending', value: money(calculatedStats.pending), note: 'Outstanding payments', icon: Wallet, tone: 'amber' },
    { label: 'Overdue Amount', value: money(calculatedStats.overdue), note: 'Grace period expired', icon: AlertCircle, tone: 'red' },
    { label: 'Total Residents', value: calculatedStats.residents, note: 'Registered members', icon: Activity, tone: 'indigo', up: true },
    { label: 'Collection Rate', value: `${calculatedStats.collectionPercentage || 0}%`, note: 'Overall performance', icon: TrendingUp, tone: 'green', up: true }
  ];

  const hasChartData = useMemo(() => {
    return chartData.some(bucket => bucket.collected > 0 || bucket.pending > 0);
  }, [chartData]);

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
          <button className="mm-button mm-button-light" onClick={handleApplyPenalty} disabled={saving}><RefreshCcw size={17} className={saving ? 'spin' : ''} /> Check Overdue Penalties</button>
          <button className="mm-button mm-button-light" onClick={exportCurrentView}><Download size={17} /> Export CSV</button>
          <button className="mm-button mm-button-primary" onClick={() => setModal('generate')}><Plus size={18} /> Generate bills</button>
        </div>
      </div>

      <div className="mm-tabs" role="tablist">
        {[
          ['overview', LayoutDashboard, 'Overview'], ['bills', ReceiptIndianRupee, 'Bills'],
          ['settings', SlidersHorizontal, 'Settings'],
          ['expenses', Wallet, 'Expenses'],
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
                  <div><h2>Collection overview</h2><p>Paid and outstanding maintenance for the last 6 months</p></div>
                  <button className="mm-select">Last 6 months <ChevronDown size={15} /></button>
                </div>
                <div className="mm-legend"><span><i className="paid" />Collected</span><span><i className="pending" />Outstanding</span></div>
                <MiniChart data={chartData} />
              </section>
            ) : null}

            <section className="mm-panel mm-health">
              <div className="mm-panel-head"><div><h2>Collection health</h2><p>Current billing cycle</p></div><Activity size={19} /></div>
              <div className="mm-ring" style={{ '--progress': `${calculatedStats.collectionPercentage || 0}%` }}>
                <div><strong>{calculatedStats.collectionPercentage || 0}%</strong><span>collected</span></div>
              </div>
              <div className="mm-health-row"><span><i className="dot green" />Paid bills</span><strong>{bills.filter((b) => (b.payment_status || b.status) === 'Paid').length}</strong></div>
              <div className="mm-health-row"><span><i className="dot amber" />Pending</span><strong>{bills.filter((b) => (b.payment_status || b.status) === 'Pending').length}</strong></div>
              <div className="mm-health-row"><span><i className="dot red" />Overdue</span><strong>{bills.filter((b) => (b.payment_status || b.status) === 'Overdue').length}</strong></div>
            </section>
          </div>

          <div className="mm-grid-lower">
            <section className="mm-panel">
              <div className="mm-panel-head"><div><h2>Recent bills</h2><p>Latest resident invoices</p></div><button className="mm-text-button" onClick={() => setTab('bills')}>View all</button></div>
              {bills.length ? <div className="mm-list">
                {bills.slice(0, 5).map((bill) => (
                  <div className="mm-list-row" key={bill.id}>
                    <div className="mm-avatar">{(bill.resident_name || 'R').slice(0, 1)}</div>
                    <div className="mm-list-main"><strong>{bill.resident_name || 'Resident'}</strong><span>Flat {bill.flat_no || '—'} · {bill.title}</span></div>
                    <div className="mm-list-amount"><strong>{money(bill.total_amount)}</strong><span className={statusClass(bill.payment_status || bill.status)}>{bill.payment_status || bill.status}</span></div>
                  </div>
                ))}
              </div> : <Empty title="No maintenance bills generated yet" copy="Generate your first monthly billing cycle." />}
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
            <label className="mm-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resident name or flat..." /></label>
            <label className="mm-filter"><Filter size={16} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option><option>Paid</option><option>Pending</option><option>Partial</option><option>Under Review</option><option>Overdue</option></select></label>
            <label className="mm-filter"><select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}><option>All</option>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
            <label className="mm-filter"><select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}><option>All</option>{yearOptions.map((year) => <option key={year}>{year}</option>)}</select></label>
          </div>
          <div className="mm-table-wrap">
            {filteredBills.length > 0 ? (
              <table className="mm-table">
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Flat</th>
                    <th>Month</th>
                    <th>Year</th>
                    <th>Base Amount</th>
                    <th>Penalty</th>
                    <th>Total Amount</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>{filteredBills.map((bill) => {
                  const currentStatus = bill.payment_status || bill.status;
                  return (
                    <tr key={bill.id}>
                      <td><strong>{bill.resident_name || 'Resident'}</strong></td>
                      <td>Flat {bill.flat_no || '—'}</td>
                      <td>{months[(Number(bill.month) || 1) - 1]}</td>
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
                              Custom
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-red-500 font-semibold">{money(bill.penalty_amount)}</td>
                      <td><strong>{money(bill.total_amount)}</strong></td>
                      <td className="text-green-600 font-semibold">{money(bill.paid_amount)}</td>
                      <td><strong>{money(bill.remaining_amount)}</strong></td>
                      <td>{date(bill.due_date)}</td>
                      <td><span className={statusClass(currentStatus)}>{currentStatus}</span></td>
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
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            ) : (
              <Empty title="No maintenance bills generated yet" copy="Try changing the search or status filter, or generate new bills." />
            )}
          </div>
        </section>
      ) : tab === 'settings' ? (
        <section className="mm-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="mm-panel-head">
            <div>
              <h2>Monthly Maintenance Rules</h2>
              <p>Configure the default title, fixed charge, due date, grace period, and late fee penalties.</p>
            </div>
          </div>
          <form onSubmit={submitSettings} className="mm-form p-4">
            <label className="mm-field mm-field-full">
              <span>Maintenance Title</span>
              <input required value={settingsForm.title} onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })} placeholder="e.g. Monthly Maintenance" />
            </label>
            <div className="mm-form-row">
              <label className="mm-field mm-field-full">
                <span>Due Day of Month</span>
                <input type="number" min="1" max="28" required value={settingsForm.due_day} onChange={(e) => setSettingsForm({ ...settingsForm, due_day: e.target.value })} placeholder="e.g. 10" />
              </label>
            </div>
            <div className="mm-form-row">
              <label className="mm-field">
                <span>Late Fee Penalty Type</span>
                <select value={settingsForm.late_fee_type} onChange={(e) => setSettingsForm({ ...settingsForm, late_fee_type: e.target.value })}>
                  <option value="fixed">Fixed Amount (₹)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </label>
              <label className="mm-field">
                <span>Penalty Rate / Value</span>
                <input type="number" min="0" required value={settingsForm.late_fee_value} onChange={(e) => setSettingsForm({ ...settingsForm, late_fee_value: e.target.value })} placeholder="e.g. 100 or 5" />
              </label>
            </div>
            <label className="mm-field mm-field-full">
              <span>Grace Days</span>
              <input type="number" min="0" required value={settingsForm.grace_days} onChange={(e) => setSettingsForm({ ...settingsForm, grace_days: e.target.value })} placeholder="e.g. 2" />
            </label>
            <div className="mm-form-actions">
              <button className="mm-button mm-button-primary" disabled={saving} style={{ width: '100%', marginTop: '12px' }}>
                {saving ? 'Saving Rules...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </section>
      ) : tab === 'payments' ? (
        <>
          <div className="mm-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
            <article className="mm-stat">
              <div className="mm-stat-icon blue"><Activity size={20} /></div>
              <div className="mm-stat-label">Total Payment Requests</div>
              <div className="mm-stat-value">{paymentsStats.totalRequests}</div>
              <div className="mm-stat-note">Submitted submissions</div>
            </article>
            <article className="mm-stat">
              <div className="mm-stat-icon amber"><AlertCircle size={20} /></div>
              <div className="mm-stat-label">Pending Verification</div>
              <div className="mm-stat-value">{paymentsStats.pendingVerification}</div>
              <div className="mm-stat-note">Awaiting admin review</div>
            </article>
            <article className="mm-stat">
              <div className="mm-stat-icon green"><CheckCircle2 size={20} /></div>
              <div className="mm-stat-label">Approved Payments</div>
              <div className="mm-stat-value">{paymentsStats.approvedPayments}</div>
              <div className="mm-stat-note">Successfully verified</div>
            </article>
            <article className="mm-stat">
              <div className="mm-stat-icon red"><X size={20} /></div>
              <div className="mm-stat-label">Rejected Payments</div>
              <div className="mm-stat-value">{paymentsStats.rejectedPayments}</div>
              <div className="mm-stat-note">Invalid submissions</div>
            </article>
            <article className="mm-stat">
              <div className="mm-stat-icon blue"><IndianRupee size={20} /></div>
              <div className="mm-stat-label">Received This Month</div>
              <div className="mm-stat-value">{money(paymentsStats.totalReceivedThisMonth)}</div>
              <div className="mm-stat-note">Current month collections</div>
            </article>
            <article className="mm-stat">
              <div className="mm-stat-icon red"><Wallet size={20} /></div>
              <div className="mm-stat-label">Pending Collection</div>
              <div className="mm-stat-value">{money(paymentsStats.pendingCollection)}</div>
              <div className="mm-stat-note">Unpaid dues total</div>
            </article>
          </div>

          <section className="mm-panel mm-table-panel" style={{ padding: '0', overflow: 'visible' }}>
            <div className="mm-panel-head" style={{ padding: '19px 19px 12px' }}>
              <div>
                <h2>Payment Verification</h2>
                <p>Review and verify resident payment requests instantly.</p>
              </div>
              <div className="mm-head-actions">
                <button className="mm-button mm-button-light" onClick={printPaymentsReport}><Eye size={17} /> Print Report</button>
                <button className="mm-button mm-button-light" onClick={exportPaymentsExcel}><Download size={17} /> Export Excel</button>
                <button className="mm-button mm-button-light" onClick={exportPaymentsCsv}><Download size={17} /> Export CSV</button>
              </div>
            </div>

            <div className="mm-payments-toolbar">
              <label className="mm-search">
                <Search size={17} />
                <input 
                  value={payFilterResident} 
                  onChange={(e) => setPayFilterResident(e.target.value)} 
                  placeholder="Search Resident Name..." 
                />
              </label>
              <div className="mm-filter">
                <input 
                  value={payFilterBillNo} 
                  onChange={(e) => setPayFilterBillNo(e.target.value)} 
                  placeholder="Bill Number (e.g. BILL-1)..." 
                />
              </div>
              <div className="mm-filter">
                <input 
                  value={payFilterUTR} 
                  onChange={(e) => setPayFilterUTR(e.target.value)} 
                  placeholder="UTR / Transaction ID..." 
                />
              </div>
              <div className="mm-filter">
                <input 
                  value={payFilterFlat} 
                  onChange={(e) => setPayFilterFlat(e.target.value)} 
                  placeholder="Flat No..." 
                />
              </div>
              <div className="mm-filter">
                <select value={payFilterStatus} onChange={(e) => setPayFilterStatus(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="mm-filter">
                <select value={payFilterMonth} onChange={(e) => setPayFilterMonth(e.target.value)}>
                  <option value="All">All Bill Months</option>
                  {months.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="mm-filter">
                <input 
                  type="date"
                  value={payFilterDate} 
                  onChange={(e) => setPayFilterDate(e.target.value)} 
                  title="Payment Date"
                />
              </div>
              <button 
                className="mm-button mm-button-light" 
                onClick={resetPaymentsFilters}
                style={{ padding: '8px 12px' }}
              >
                Reset Filters
              </button>
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
                    <th>Resident</th>
                    <th>Flat No.</th>
                    <th>Bill Number</th>
                    <th>Bill Month</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Payment Date</th>
                    <th>UTR Number</th>
                    <th>Screenshot Thumbnail</th>
                    <th>Status</th>
                    <th>Submitted Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((payment) => {
                    const proofPath = paymentProofPath(payment);
                    const proofUrl = paymentProofUrl(payment);
                    const proofBroken = brokenProofs[payment.id];
                    const currentPaymentStatus = payment.original_payment_status || payment.payment_status;
                    const isPending = ['Pending', 'Pending Verification', 'Under Review'].includes(currentPaymentStatus);
                    
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
                          <small>Reg: {date(payment.created_at)}</small>
                        </td>
                        <td>Flat {payment.flat_no}</td>
                        <td>{payment.bill_number || `BILL-${payment.bill_id}`}</td>
                        <td>{months[(Number(payment.month) || 1) - 1]} {payment.year}</td>
                        <td><strong>{money(payment.amount)}</strong></td>
                        <td>{payment.payment_method}</td>
                        <td>{date(payment.paid_at)}</td>
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
                                  src={proofUrl}
                                  alt="Payment proof thumbnail"
                                  loading="lazy"
                                  style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--portal-line)', background: '#f8fafc', transition: 'transform 0.15s ease' }}
                                  onError={() => setBrokenProofs((current) => ({ ...current, [payment.id]: true }))}
                                />
                              </button>
                            </div>
                          ) : proofPath && proofBroken ? (
                            <span className="text-xs text-red-500 font-semibold">Broken link</span>
                          ) : (
                            <span className="text-xs text-slate-400">No proof</span>
                          )}
                        </td>
                        <td>
                          <span className={statusClass(currentPaymentStatus)}>
                            {currentPaymentStatus}
                          </span>
                        </td>
                        <td>{date(payment.created_at)}</td>
                        <td>
                          <div className="mm-action-group">
                            <button
                              className="mm-mini-action"
                              onClick={() => setViewingDetails(payment)}
                              title="View Details"
                            >
                              Details
                            </button>
                            
                            {isPending && (
                              <>
                                <button
                                  className="mm-mini-action green"
                                  onClick={() => handleApprovePayment(payment)}
                                  disabled={saving}
                                  title="Approve"
                                >
                                  Approve
                                </button>
                                <button
                                  className="mm-mini-action red"
                                  onClick={() => {
                                    setRejectingPayment(payment);
                                    setRejectionType('Invalid Screenshot');
                                    setCustomRejectionReason('');
                                  }}
                                  disabled={saving}
                                  title="Reject"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            
                            {receiptAvailable(currentPaymentStatus) && (
                              <button className="mm-mini-action blue" onClick={() => handlePrintReceipt(payment)} title="Print Receipt"><Printer size={13} /> Print Receipt</button>
                            )}
                              
                              {currentPaymentStatus === 'Rejected' && (
                                <button
                                  className="mm-mini-action red"
                                  onClick={() => handleReconsiderPayment(payment)}
                                  disabled={saving}
                                  title="Reconsider"
                                >
                                  Reconsider
                                </button>
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
                    title="No payment submissions found" 
                    copy="Try resetting your filters or waiting for resident submissions." 
                  />
                )}
              </div>

              {filteredPayments.length > 0 && (
                <div className="mm-pagination">
                  <div className="mm-pagination-info">
                    Showing {(currentPage - 1) * rowsPerPage + 1}–{Math.min(filteredPayments.length, currentPage * rowsPerPage)} of {filteredPayments.length} payments
                  </div>
                  <div className="mm-pagination-controls">
                    <button
                      className="mm-pagination-page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                    >
                      First
                    </button>
                    <button
                      className="mm-pagination-page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      Prev
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
                      Next
                    </button>
                    <button
                      className="mm-pagination-page-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      Last
                    </button>
                  </div>
                  <div className="mm-pagination-limit">
                    <span>Rows per page:</span>
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
          <div className="mm-panel-head"><div><h2>Maintenance expenses</h2><p>Operational spending and vendor payments.</p></div><button className="mm-button mm-button-primary" onClick={() => setModal('expense')}><Plus size={17} /> Record expense</button></div>
          <div className="mm-expense-summary"><div><span>Current month spend</span><strong>{money(expenseSummary.currentMonthSpend)}</strong></div><div><span>Transactions</span><strong>{expenseSummary.transactions}</strong></div><div><span>Pending approval</span><strong>{expenseSummary.pendingApproval}</strong></div></div>
          <div className="mm-table-wrap"><table className="mm-table"><thead><tr><th>Expense</th><th>Category</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{expenses.map((item) => <tr key={item.id}><td><strong>{item.expense_number}</strong><small>{item.description || 'Maintenance expense'}</small></td><td>{item.category}</td><td>{item.vendor}</td><td>{date(item.expense_date)}</td><td><strong>{money(item.amount)}</strong></td><td><span className={statusClass(item.status)}>{item.status}</span></td><td><button className="mm-delete-expense-btn" disabled={deletingExpenseId === item.id} onClick={() => setDeletingExpense(item)}>{deletingExpenseId === item.id ? <RefreshCcw className="spin" size={13} /> : <Trash2 size={13} />} Delete</button></td></tr>)}</tbody>
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

      {modal === 'generate' && (
        <Modal title="Generate Monthly Bills" subtitle="Generate a billing record for all assigned resident flats automatically." onClose={() => setModal(null)}>
          <form onSubmit={submitCycle} className="mm-form">
            {settings ? (
              <>
                <div className="rounded-lg bg-slate-50 p-4 mb-4 border border-slate-100 text-sm">
                  <div className="mb-2"><strong>Default Title:</strong> {settings.title}</div>
                  <div className="mb-2"><strong>Fixed Charge:</strong> {money(settings.fixed_amount)}</div>
                  <div className="mb-2"><strong>Due Date Rule:</strong> {settings.due_day}th day of month</div>
                  <div className="mb-2"><strong>Late Fee Penalty:</strong> {settings.late_fee_value}{settings.late_fee_type === 'percentage' ? '%' : ' ₹'} (grace: {settings.grace_days} days)</div>
                  <hr className="my-2 border-slate-200" style={{ borderColor: '#e2e8f0' }} />
                  <div className="font-semibold text-indigo-600" style={{ color: '#4f46e5', fontWeight: 600 }}>Next Billing Month: {nextPendingMonthDetails?.label}</div>
                </div>
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
              <span>Select Rejection Reason</span>
              <select 
                value={rejectionType} 
                onChange={(e) => setRejectionType(e.target.value)}
                required
              >
                <option value="Invalid Screenshot">Invalid Screenshot</option>
                <option value="Incorrect Amount">Incorrect Amount</option>
                <option value="Duplicate Payment">Duplicate Payment</option>
                <option value="Invalid UTR">Invalid UTR</option>
                <option value="Other">Other (Write Custom Reason)</option>
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
          
          <div className="mm-form-actions" style={{ padding: '0 20px 20px' }}>
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
