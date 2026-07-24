import React, { useEffect, useState, useCallback } from 'react';
import { 
  FileText, SlidersHorizontal, Download, Printer, 
  ReceiptIndianRupee, Landmark, TrendingUp, Info
} from 'lucide-react';
import { maintenanceAPI } from '../services/api';
import './maintenance.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const dateStr = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function AGMReportScreen() {
  const [data, setData] = useState({
    financialSummary: { totalBillsGenerated: 0, totalAmountCollected: 0, outstandingAmount: 0 },
    writeOffSummary: { totalMaintenanceWriteOff: 0, totalPenaltyWriteOff: 0, totalWriteOff: 0, numberMaintenanceWriteOffs: 0, numberPenaltyWriteOffs: 0, numberFullyWrittenOff: 0 },
    detailedTable: []
  });

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
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

      const res = await maintenanceAPI.getAGMReport(params);
      setData(res.data?.data || res.data || {
        financialSummary: { totalBillsGenerated: 0, totalAmountCollected: 0, outstandingAmount: 0 },
        writeOffSummary: { totalMaintenanceWriteOff: 0, totalPenaltyWriteOff: 0, totalWriteOff: 0, numberMaintenanceWriteOffs: 0, numberPenaltyWriteOffs: 0, numberFullyWrittenOff: 0 },
        detailedTable: []
      });
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
              ${tableRowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 30px; color: #64748b;">No write-off approvals match this report scope.</td></tr>'}
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

  const resetFilters = () => {
    setFilters({
      financialYear: '2026-2027',
      startDate: '',
      endDate: '',
      resident: '',
      flat: '',
      wing: '',
      month: 'All',
      type: 'All'
    });
  };

  return (
    <div className="mm-module" style={{ padding: '24px' }}>
      {toast && <div className="mm-toast" style={{ position: 'fixed', bottom: '20px', right: '20px', padding: '12px 24px', background: '#334155', color: '#fff', borderRadius: '8px', zIndex: 1000, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>{toast}</div>}
      
      <div className="mm-page-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '26px', fontWeight: '800', color: '#1e293b' }}>
            <FileText size={28} style={{ color: '#4f46e5' }} /> AGM Reports (Financials & Write-Offs)
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            Audited financial report and write-off ledger details for Annual General Meetings (AGM). Restricted to admins.
          </p>
        </div>
        <div className="agm-report-actions">
          <button onClick={handlePrint} className="mm-button mm-button-light agm-report-button agm-report-button-light">
            <Printer size={16} /> Print Report
          </button>
          <button onClick={handleExportCSV} className="mm-button mm-button-primary agm-report-button agm-report-button-primary">
            <Download size={16} /> Export to Excel / CSV
          </button>
        </div>
      </div>

      {/* Summary Dashboards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Financial Summary Card */}
        <section className="mm-panel" style={{ padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dbeafe', paddingBottom: '12px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={18} style={{ color: '#3b82f6' }} /> Regular Financials
            </h2>
            <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '700', textTransform: 'uppercase' }}>Scope: FY {filters.financialYear}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Total Bills Generated</span>
              <strong style={{ fontSize: '16px', color: '#1e293b' }}>{money(data.financialSummary.totalBillsGenerated)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Total Amount Collected</span>
              <strong style={{ fontSize: '16px', color: '#15803d' }}>{money(data.financialSummary.totalAmountCollected)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Total Expenses</span>
              <strong style={{ fontSize: '16px', color: '#475569' }}>{money(data.financialSummary.totalExpenses)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
              <span style={{ color: '#475569', fontSize: '13px', fontWeight: '700' }}>Net Balance</span>
              <strong style={{ fontSize: '16px', color: '#1e3a8a' }}>{money(data.financialSummary.netBalance)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
              <span style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>Outstanding Unpaid</span>
              <strong style={{ fontSize: '18px', color: '#b91c1c' }}>{money(data.financialSummary.outstandingAmount)}</strong>
            </div>
          </div>
        </section>

        {/* Write-Off Summary Card */}
        <section className="mm-panel" style={{ padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fee2e2', paddingBottom: '12px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#7f1d1d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: '#ef4444' }} /> Write-Off Summary
            </h2>
            <span style={{ fontSize: '11px', color: '#fca5a5', fontWeight: '700', textTransform: 'uppercase' }}>Audited write-offs</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Maintenance Write-Off</span>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: '15px', color: '#1e293b' }}>{money(data.writeOffSummary.totalMaintenanceWriteOff)}</strong>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{data.writeOffSummary.numberMaintenanceWriteOffs} approvals</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Penalty Write-Off</span>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: '15px', color: '#1e293b' }}>{money(data.writeOffSummary.totalPenaltyWriteOff)}</strong>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{data.writeOffSummary.numberPenaltyWriteOffs} approvals</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Number of Write-Offs</span>
              <strong style={{ fontSize: '15px', color: '#1e293b' }}>{data.writeOffSummary.numberWriteOffs}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
              <span style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>Total Audit Write-Offs</span>
              <strong style={{ fontSize: '18px', color: '#b91c1c' }}>{money(data.writeOffSummary.totalWriteOff)}</strong>
            </div>
          </div>
        </section>
      </div>



      {/* AGM Ledger Table */}
      <section className="mm-panel" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div className="mm-panel-head" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>Write-Off Audited Ledger</h2>
            <p style={{ color: '#64748b', fontSize: '12px' }}>Ledger of write-off approvals corresponding to the filtered scope.</p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{data.detailedTable.length} matches</span>
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Generating AGM Ledger...</div>
        ) : data.detailedTable.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="mm-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px' }}>Resident & Flat</th>
                  <th style={{ padding: '14px 16px' }}>Billing Period</th>
                  <th style={{ padding: '14px 16px' }}>Original Bill</th>
                  <th style={{ padding: '14px 16px' }}>Amount Written-Off</th>
                  <th style={{ padding: '14px 16px' }}>Amount Collected</th>
                  <th style={{ padding: '14px 16px' }}>Type</th>
                  <th style={{ padding: '14px 16px' }}>Approved By</th>
                  <th style={{ padding: '14px 16px' }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.detailedTable.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <strong>{item.resident_name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Flat {item.flat_no} · Wing {item.wing}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>{months[item.month - 1]} {item.year}</td>
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
                        {item.type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>{item.admin_name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontStyle: 'italic' }}>{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <ReceiptIndianRupee size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
            <strong style={{ display: 'block', color: '#64748b' }}>No Write-Off Approvals Audited</strong>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>No approvals recorded in this filter scope.</span>
          </div>
        )}
      </section>


    </div>
  );
}
