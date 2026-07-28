/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, SlidersHorizontal, Download, Printer, Edit2, RotateCcw,
  ReceiptIndianRupee, Landmark, TrendingUp, Info, Eye, X, CheckCircle2, FileCheck
} from 'lucide-react';
import { maintenanceAPI, settingsAPI } from '../services/api';
import { printWriteOffReceipt, downloadWriteOffReceiptPdf } from '../utils/paymentReceipt';
import './maintenance.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const dateStr = (value, locale = 'en-IN') => {
  if (!value) return '—';
  const targetLocale = locale === 'hi' ? 'hi-IN' : (locale === 'mr' ? 'mr-IN' : 'en-IN');
  return new Date(value).toLocaleDateString(targetLocale, { day: '2-digit', month: 'short', year: 'numeric' });
};
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function AGMReportScreen() {
  const { t } = useTranslation();
  const translateMonth = (monthNum) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const key = monthNames[monthNum - 1];
    return t(`months.${key}`, key);
  };

  const [data, setData] = useState({
    financialSummary: { totalBillsGenerated: 0, totalAmountCollected: 0, outstandingAmount: 0 },
    writeOffSummary: { totalMaintenanceWriteOff: 0, totalPenaltyWriteOff: 0, totalWriteOff: 0, numberMaintenanceWriteOffs: 0, numberPenaltyWriteOffs: 0, numberFullyWrittenOff: 0 },
    detailedTable: []
  });

  const [societySettings, setSocietySettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  
  // Modal states
  const [viewingItem, setViewingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', reason: '' });

  const [filters, setFilters] = useState({
    financialYear: '2026-2027',
    startDate: '',
    endDate: '',
    resident: '',
    flat: '',
    wing: '',
    month: 'All',
    type: 'All'
  });

  const notify = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3000);
  };

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.financialYear !== 'All') params.financialYear = filters.financialYear;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.resident) params.resident = filters.resident;
      if (filters.flat) params.flat = filters.flat;
      if (filters.wing) params.wing = filters.wing;
      if (filters.month !== 'All') params.month = filters.month;
      if (filters.type !== 'All') params.type = filters.type;

      const [resReport, resSettings] = await Promise.all([
        maintenanceAPI.getAGMReport(params),
        settingsAPI.get().catch(() => ({ data: {} }))
      ]);

      setData(resReport.data?.data || resReport.data || {
        financialSummary: { totalBillsGenerated: 0, totalAmountCollected: 0, outstandingAmount: 0 },
        writeOffSummary: { totalMaintenanceWriteOff: 0, totalPenaltyWriteOff: 0, totalWriteOff: 0, numberMaintenanceWriteOffs: 0, numberPenaltyWriteOffs: 0, numberFullyWrittenOff: 0 },
        detailedTable: []
      });
      setSocietySettings(resSettings.data?.data || resSettings.data || {});
    } catch (err) {
      console.error(err);
      notify('Failed to load AGM Report data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrintSingleVoucher = (item) => {
    try {
      printWriteOffReceipt({
        ...item,
        base_maintenance_charge: Number(item.bill_amount || item.bill_total || 0) - Number(item.bill_penalty || 0),
        late_fee: Number(item.bill_penalty || 0),
        total_amount: Number(item.bill_total || 0),
        write_off_amount: Number(item.amount || 0),
        remaining_amount: Number(item.bill_remaining || 0),
        approved_by: item.admin_name,
        approval_date: item.created_at
      }, societySettings);
    } catch (err) {
      console.error(err);
      notify('Failed to print write-off receipt');
    }
  };

  const handleDownloadSinglePdf = async (item) => {
    try {
      await downloadWriteOffReceiptPdf({
        ...item,
        base_maintenance_charge: Number(item.bill_amount || item.bill_total || 0) - Number(item.bill_penalty || 0),
        late_fee: Number(item.bill_penalty || 0),
        total_amount: Number(item.bill_total || 0),
        write_off_amount: Number(item.amount || 0),
        remaining_amount: Number(item.bill_remaining || 0),
        approved_by: item.admin_name,
        approval_date: item.created_at
      }, societySettings);
    } catch (error) {
      notify('Failed to download PDF receipt');
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditForm({
      amount: String(item.amount),
      reason: item.reason || ''
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editForm.reason.trim()) {
      notify('A reason is required to update the write-off');
      return;
    }
    if (!editForm.amount || Number(editForm.amount) <= 0) {
      notify('Please enter a valid write-off amount');
      return;
    }

    if (!window.confirm('Are you sure you want to update this write-off? This will adjust the remaining bill balance accordingly.')) {
      return;
    }

    setSaving(true);
    try {
      await maintenanceAPI.editWriteOff(editingItem.id, {
        amount: Number(editForm.amount),
        reason: editForm.reason
      });
      notify('Write-off updated successfully');
      setEditingItem(null);
      await loadReport();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not update write-off');
    } finally {
      setSaving(false);
    }
  };

  const handleReverseClick = async (item) => {
    if (!window.confirm(`Are you sure you want to REVERSE this write-off of ${money(item.amount)}? This will delete the write-off record and restore the unpaid balance back onto the resident's bill.`)) {
      return;
    }

    setSaving(true);
    try {
      await maintenanceAPI.reverseWriteOff(item.id);
      notify('Write-off reversed and balance restored');
      await loadReport();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not reverse write-off');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return notify('Popup blocked. Allow popups to print report.');

    const summaryCardsHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; background-color: #f8fafc;">
          <h3 style="margin-top: 0; color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">Financial Summary</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="padding: 6px 0;">Total Bills Generated</td><td style="text-align: right; font-weight: bold;">${money(data.financialSummary.totalBillsGenerated)}</td></tr>
            <tr><td style="padding: 6px 0;">Total Amount Collected</td><td style="text-align: right; font-weight: bold; color: #15803d;">${money(data.financialSummary.totalAmountCollected)}</td></tr>
            <tr><td style="padding: 6px 0;">Outstanding Amount</td><td style="text-align: right; font-weight: bold; color: #b91c1c;">${money(data.financialSummary.outstandingAmount)}</td></tr>
            <tr><td style="padding: 6px 0;">Total Expenses</td><td style="text-align: right; font-weight: bold; color: #475569;">${money(data.financialSummary.totalExpenses)}</td></tr>
            <tr><td style="padding: 6px 0; border-top: 1px dashed #cbd5e1;">Net Balance</td><td style="text-align: right; font-weight: bold; color: #1e3a8a; border-top: 1px dashed #cbd5e1; padding-top: 4px;">${money(data.financialSummary.netBalance)}</td></tr>
          </table>
        </div>
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; background-color: #f8fafc;">
          <h3 style="margin-top: 0; color: #7f1d1d; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">Write-Off Summary</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="padding: 6px 0;">Maintenance Write-Offs (${data.writeOffSummary.numberMaintenanceWriteOffs} approvals)</td><td style="text-align: right; font-weight: bold;">${money(data.writeOffSummary.totalMaintenanceWriteOff)}</td></tr>
            <tr><td style="padding: 6px 0;">Penalty Write-Offs (${data.writeOffSummary.numberPenaltyWriteOffs} approvals)</td><td style="text-align: right; font-weight: bold;">${money(data.writeOffSummary.totalPenaltyWriteOff)}</td></tr>
            <tr><td style="padding: 6px 0;">Total Write-Off</td><td style="text-align: right; font-weight: bold; color: #b91c1c;">${money(data.writeOffSummary.totalWriteOff)}</td></tr>
            <tr><td style="padding: 6px 0; font-size: 12px; color: #64748b;">Number of Write-Offs</td><td style="text-align: right; font-weight: bold; font-size: 12px;">${data.writeOffSummary.numberWriteOffs}</td></tr>
            <tr><td style="padding: 6px 0; font-size: 12px; color: #64748b;">Fully Written-Off Bills Count</td><td style="text-align: right; font-weight: bold; font-size: 12px;">${data.writeOffSummary.numberFullyWrittenOff}</td></tr>
          </table>
        </div>
      </div>
    `;

    const tableRowsHtml = data.detailedTable.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #cbd5e1;">${item.resident_name}<br/><small style="color: #64748b;">Flat ${item.flat_no} · Wing ${item.wing}</small></td>
        <td style="padding: 10px; border-bottom: 1px solid #cbd5e1;">${months[item.month - 1]} ${item.year}</td>
        <td style="padding: 10px; border-bottom: 1px solid #cbd5e1;">${item.type}</td>
        <td style="padding: 10px; border-bottom: 1px solid #cbd5e1; font-weight: bold;">${money(item.bill_total)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #cbd5e1; font-weight: bold; color: #b91c1c;">${money(item.amount)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #cbd5e1;">${dateStr(item.created_at)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #cbd5e1;">${item.admin_name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #cbd5e1; font-style: italic;">${item.reason}</td>
      </tr>
    `).join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Annual General Meeting (AGM) Write-Off Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            h1 { font-size: 26px; margin-bottom: 4px; color: #0f172a; }
            .header { margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; background-color: #f1f5f9; padding: 12px 10px; border-bottom: 2px solid #cbd5e1; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Annual General Meeting (AGM) Financial & Write-Off Report</h1>
            <div style="color: #64748b; font-size: 13px;">
              Report Scope: Financial Year ${filters.financialYear} · Generated on ${new Date().toLocaleString('en-IN')}
            </div>
          </div>
          ${summaryCardsHtml}
          <h3 style="color: #334155; margin-bottom: 10px;">Approved Write-Off Audited Ledger</h3>
          <table>
            <thead>
              <tr>
                <th>Resident & Flat</th>
                <th>Period</th>
                <th>Type</th>
                <th>Original Bill</th>
                <th>Written-Off</th>
                <th>Approved Date</th>
                <th>Approved By</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #64748b;">No write-off approvals match this report scope.</td></tr>'}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportCSV = () => {
    const headers = ['Resident Name', 'Flat No', 'Wing', 'Billing Month', 'Billing Year', 'Write-Off Type', 'Amount (INR)', 'Original Bill Total (INR)', 'Original Bill Remaining (INR)', 'Approval Date', 'Approved By', 'Reason'];
    const rows = data.detailedTable.map(item => [
      `"${item.resident_name.replace(/"/g, '""')}"`,
      `"${item.flat_no}"`,
      `"${item.wing}"`,
      months[item.month - 1],
      item.year,
      item.type,
      item.amount,
      item.bill_total,
      item.bill_remaining,
      new Date(item.created_at).toISOString().split('T')[0],
      `"${item.admin_name.replace(/"/g, '""')}"`,
      `"${item.reason.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AGM_WriteOff_Report_FY_${filters.financialYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mm-module" style={{ padding: '24px' }}>
      {toast && <div className="mm-toast" style={{ position: 'fixed', bottom: '20px', right: '20px', padding: '12px 24px', background: '#334155', color: '#fff', borderRadius: '8px', zIndex: 1000, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>{toast}</div>}
      
      <div className="mm-page-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '26px', fontWeight: '800', color: '#1e293b' }}>
            <FileText size={28} style={{ color: '#4f46e5' }} /> {t('agmReport.title')}
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            {t('agmReport.subtitle')}
          </p>
        </div>
        <div className="agm-report-actions">
          <button onClick={handlePrint} className="mm-button mm-button-light agm-report-button agm-report-button-light">
            <Printer size={16} /> {t('agmReport.printReport')}
          </button>
          <button onClick={handleExportCSV} className="mm-button mm-button-primary agm-report-button agm-report-button-primary">
            <Download size={16} /> {t('agmReport.exportExcelCsv')}
          </button>
        </div>
      </div>

      {/* Summary Dashboards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Financial Summary Card */}
        <section className="mm-panel" style={{ padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dbeafe', paddingBottom: '12px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={18} style={{ color: '#3b82f6' }} /> {t('agmReport.regularFinancials')}
            </h2>
            <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '700', textTransform: 'uppercase' }}>{t('agmReport.scopeFy')} {filters.financialYear}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>{t('agmReport.totalBillsGenerated')}</span>
              <strong style={{ fontSize: '16px', color: '#1e293b' }}>{money(data.financialSummary.totalBillsGenerated)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>{t('agmReport.totalAmountCollected')}</span>
              <strong style={{ fontSize: '16px', color: '#15803d' }}>{money(data.financialSummary.totalAmountCollected)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>{t('agmReport.totalExpenses')}</span>
              <strong style={{ fontSize: '16px', color: '#475569' }}>{money(data.financialSummary.totalExpenses)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
              <span style={{ color: '#475569', fontSize: '13px', fontWeight: '700' }}>{t('agmReport.netBalance')}</span>
              <strong style={{ fontSize: '16px', color: '#1e3a8a' }}>{money(data.financialSummary.netBalance)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
              <span style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>{t('agmReport.outstandingUnpaid')}</span>
              <strong style={{ fontSize: '18px', color: '#b91c1c' }}>{money(data.financialSummary.outstandingAmount)}</strong>
            </div>
          </div>
        </section>

        {/* Write-Off Summary Card */}
        <section className="mm-panel" style={{ padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fee2e2', paddingBottom: '12px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#7f1d1d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: '#ef4444' }} /> {t('agmReport.writeOffSummary')}
            </h2>
            <span style={{ fontSize: '11px', color: '#fca5a5', fontWeight: '700', textTransform: 'uppercase' }}>{t('agmReport.auditedWriteOffs')}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>{t('agmReport.maintenanceWriteOff')}</span>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: '15px', color: '#1e293b' }}>{money(data.writeOffSummary.totalMaintenanceWriteOff)}</strong>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{data.writeOffSummary.numberMaintenanceWriteOffs} {t('agmReport.approvals')}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>{t('agmReport.penaltyWriteOff')}</span>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: '15px', color: '#1e293b' }}>{money(data.writeOffSummary.totalPenaltyWriteOff)}</strong>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{data.writeOffSummary.numberPenaltyWriteOffs} {t('agmReport.approvals')}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>{t('agmReport.numberOfWriteOffs')}</span>
              <strong style={{ fontSize: '15px', color: '#1e293b' }}>{data.writeOffSummary.numberWriteOffs}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
              <span style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>{t('agmReport.totalAuditWriteOffs')}</span>
              <strong style={{ fontSize: '18px', color: '#b91c1c' }}>{money(data.writeOffSummary.totalWriteOff)}</strong>
            </div>
          </div>
        </section>
      </div>

      {/* AGM Ledger Table */}
      <section className="mm-panel" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div className="mm-panel-head" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>{t('agmReport.writeOffAuditedLedger')}</h2>
            <p style={{ color: '#64748b', fontSize: '12px' }}>{t('agmReport.ledgerSubtitle')}</p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{data.detailedTable.length} {t('agmReport.matches')}</span>
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Generating AGM Ledger...</div>
        ) : data.detailedTable.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="mm-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px' }}>{t('agmReport.residentFlat')}</th>
                  <th style={{ padding: '14px 16px' }}>{t('agmReport.billingPeriod')}</th>
                  <th style={{ padding: '14px 16px' }}>{t('agmReport.originalBill')}</th>
                  <th style={{ padding: '14px 16px' }}>{t('agmReport.amountWrittenOff')}</th>
                  <th style={{ padding: '14px 16px' }}>{t('agmReport.amountCollected')}</th>
                  <th style={{ padding: '14px 16px' }}>{t('agmReport.type')}</th>
                  <th style={{ padding: '14px 16px' }}>{t('agmReport.approvedBy')}</th>
                  <th style={{ padding: '14px 16px' }}>{t('agmReport.reason')}</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {data.detailedTable.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <strong>{item.resident_name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{t('common.flat')} {item.flat_no} · {t('common.wing', 'Wing')} {item.wing}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>{translateMonth(item.month)} {item.year}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '500' }}>{money(item.bill_total)}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#b91c1c' }}>{money(item.amount)}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#15803d' }}>{money(item.bill_paid)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        padding: '2px 8px', 
                        borderRadius: '999px', 
                        fontSize: '11px', 
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        backgroundColor: item.type === 'Full' ? '#fef2f2' : '#eff6ff',
                        color: item.type === 'Full' ? '#991b1b' : '#1d4ed8'
                      }}>
                        {item.type === 'Full' ? t('writeOff.full', 'Full') : t('writeOff.partial', 'Partial')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>{item.admin_name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontStyle: 'italic', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.reason}>{item.reason}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', position: 'relative', zIndex: 5 }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handlePrintSingleVoucher(item); }}
                          title={t('common.print', 'Print Receipt')}
                          style={{
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#334155',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDownloadSinglePdf(item); }}
                          title={t('common.download', 'Download PDF')}
                          style={{
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#334155',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Download size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}
                          title={t('common.edit', 'Edit Write-Off')}
                          style={{
                            border: '1px solid #fde68a',
                            background: '#fef3c7',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#d97706',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleReverseClick(item); }}
                          title={t('common.reset', 'Reverse Write-Off')}
                          style={{
                            border: '1px solid #fecaca',
                            background: '#fee2e2',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#dc2626',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <RotateCcw size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <ReceiptIndianRupee size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
            <strong style={{ display: 'block', color: '#64748b' }}>{t('agmReport.noWriteOffsAudited')}</strong>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>{t('agmReport.noApprovalsScope')}</span>
          </div>
        )}
      </section>

      {/* Edit Write-Off Modal */}
      {editingItem && (
        <div className="mm-modal-backdrop" role="presentation" onMouseDown={() => setEditingItem(null)} style={{ zIndex: 1000 }}>
          <div className="mm-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
            <div className="mm-modal-head" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>Edit Write-Off Details</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{editingItem.resident_name} · Flat {editingItem.flat_no}</p>
              </div>
              <button onClick={() => setEditingItem(null)} className="mm-icon-btn" style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}>
                <div style={{ marginBottom: '6px' }}><strong>Write-Off Type:</strong> {editingItem.type}</div>
                <div style={{ marginBottom: '6px' }}><strong>Original Bill Total:</strong> {money(editingItem.bill_total)}</div>
                <div><strong>Current Written Off:</strong> {money(editingItem.amount)}</div>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                New Written-Off Amount (₹)
                <input 
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                Reason for Adjustment (Mandatory)
                <textarea 
                  rows="3"
                  required
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  placeholder="Explain the reason for modifying this write-off amount..."
                  style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingItem(null)} className="mm-button mm-button-light" style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} className="mm-button mm-button-primary" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#d97706', color: '#fff', cursor: 'pointer' }}>
                  {saving ? 'Saving...' : 'Save Adjustments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
