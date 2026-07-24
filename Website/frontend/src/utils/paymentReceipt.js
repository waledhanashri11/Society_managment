const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

const amount = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const amountRs = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

const formatDate = (value, includeTime = false) => value
  ? new Date(value).toLocaleString('en-IN', includeTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const billingPeriod = (receipt) => new Date(2026, Math.max(0, Number(receipt.month || 1) - 1), 1)
  .toLocaleDateString('en-IN', { month: 'long' }) + (receipt.year ? ` ${receipt.year}` : '');

const logoUrl = (settings = {}) => settings.societyLogo || settings.societyLogoUrl || settings.logoUrl || settings.logo || '';

export const receiptAvailable = (status) => ['approved', 'paid'].includes(String(status || '').toLowerCase());

export const createReceiptElement = (receipt, settings = {}) => {
  const element = document.createElement('section');
  const logo = logoUrl(settings);
  const resident = receipt.resident_name || receipt.residentName || 'Resident';
  const billNumber = receipt.bill_number || `BILL-${receipt.bill_id || receipt.id}`;
  const receiptNumber = receipt.receipt_number || `RCP-${receipt.id || receipt.payment_id || billNumber}`;
  const paidAmount = receipt.amount ?? receipt.paid_amount ?? receipt.total_amount;

  element.style.cssText = 'width:760px;background:#fff;color:#172033;font-family:Arial,sans-serif;padding:32px;box-sizing:border-box;';
  element.innerHTML = `
    <div style="border:1px solid #dbe5f0;border-radius:16px;overflow:hidden;">
      <div style="background:#0f4c81;color:#fff;padding:25px 28px;display:flex;justify-content:space-between;align-items:center;gap:20px;">
        <div style="display:flex;align-items:center;gap:14px;">
          ${logo ? `<img src="${escapeHtml(logo)}" alt="Society logo" style="width:48px;height:48px;object-fit:contain;background:#fff;border-radius:8px;padding:3px;" />` : ''}
          <div><div style="font-size:12px;opacity:.82;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(settings.societyName || 'Society Management System')}</div><h1 style="font-size:28px;margin:5px 0 0;">Payment Receipt</h1></div>
        </div>
        <div style="text-align:right;font-size:12px;"><div style="opacity:.8;">RECEIPT NUMBER</div><strong style="font-size:15px;">${escapeHtml(receiptNumber)}</strong></div>
      </div>
      <div style="padding:26px 28px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-bottom:22px;">
          <div><div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;">Resident</div><strong style="display:block;margin-top:4px;font-size:16px;">${escapeHtml(resident)}</strong><span style="color:#475569;font-size:13px;">Flat ${escapeHtml(receipt.flat_no || '—')} (${escapeHtml(receipt.flat_type_name || 'Not Assigned')})</span></div>
          <div style="text-align:right;"><div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;">Payment status</div><strong style="display:inline-block;margin-top:5px;padding:5px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;">PAID</strong></div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tbody>
            <tr><td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#64748b;">Bill Number</td><td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:600;">${escapeHtml(billNumber)}</td></tr>
            <tr><td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#64748b;">Billing Period</td><td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;">${escapeHtml(billingPeriod(receipt))}</td></tr>
            <tr><td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#64748b;">Due Date</td><td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;">${formatDate(receipt.due_date)}</td></tr>
            <tr><td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#64748b;">Payment Date</td><td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;">${formatDate(receipt.paid_at || receipt.payment_date)}</td></tr>
            <tr><td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#64748b;">Base Maintenance Charge</td><td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;">${amount(receipt.base_maintenance_charge ?? receipt.amount_base ?? receipt.maintenance_amount ?? receipt.base_amount ?? receipt.bill_amount)}</td></tr>
            <tr><td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#64748b;">Late Fee</td><td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;">${amount(receipt.late_fee ?? receipt.penalty_amount)}</td></tr>
            <tr><td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#64748b;">Payment Mode</td><td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;">${escapeHtml(receipt.payment_method || '—')}</td></tr>
            <tr><td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#64748b;">Transaction ID</td><td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;font-family:monospace;">${escapeHtml(receipt.utr_number || receipt.transaction_id || '—')}</td></tr>
          </tbody>
        </table>
        <div style="display:flex;justify-content:space-between;align-items:center;background:#eff6ff;margin-top:18px;padding:16px;border-radius:10px;"><span style="font-weight:bold;color:#1e3a5f;">Total Amount Paid</span><strong style="font-size:21px;color:#0f4c81;">${amount(paidAmount)}</strong></div>
        <p style="margin:22px 0 0;text-align:right;color:#64748b;font-size:11px;">Generated: ${formatDate(new Date(), true)}</p>
      </div>
      <div style="padding:15px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#64748b;text-align:center;font-size:11px;">This is a computer-generated receipt. No signature required.</div>
    </div>`;
  return element;
};

export const printPaymentReceipt = (receipt, settings) => {
  const element = createReceiptElement(receipt, settings);
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) throw new Error('Popup blocked');
  printWindow.document.write(`<!doctype html><html><head><title>Payment Receipt</title><style>@page{margin:12mm}body{margin:0;background:#fff}*{box-sizing:border-box}</style></head><body>${element.outerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
};

export const downloadPaymentReceiptPdf = async (receipt, settings) => {
  const element = createReceiptElement(receipt, settings);
  element.style.width = '760px';
  element.style.background = '#fff';
  element.style.color = '#172033';
  element.style.fontFamily = 'Arial,sans-serif';
  element.style.padding = '32px';
  element.style.boxSizing = 'border-box';

  const billNumber = receipt.bill_number || `BILL-${receipt.bill_id || receipt.id}`;
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = Math.max(0, Number(receipt.month || 1) - 1);
  const shortMonth = shortMonths[monthIdx];
  const year = receipt.year || new Date().getFullYear();
  const filename = `Receipt_${billNumber}_${shortMonth}-${year}.pdf`;

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf().set({
      margin: 8,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element.outerHTML).save();
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

export const createWriteOffReceiptElement = (receipt, settings = {}) => {
  const element = document.createElement('section');
  const resident = receipt.resident_name || receipt.residentName || 'Resident';
  const billNumber = receipt.bill_number || `BILL-${receipt.bill_id || receipt.id}`;
  const baseAmount = receipt.base_maintenance_charge ?? receipt.bill_amount ?? receipt.amount ?? 0;
  const lateFee = receipt.late_fee ?? receipt.penalty_amount ?? 0;
  const originalTotal = receipt.total_amount ?? (Number(baseAmount || 0) + Number(lateFee || 0));
  const maintenanceWrittenOff = Number(receipt.maintenance_write_off_amount || 0);
  const penaltyWrittenOff = Number(receipt.penalty_write_off_amount || 0);
  const writtenOffAmount = Number(receipt.write_off_amount || 0);
  const remainingPayable = Number(receipt.remaining_amount ?? 0);
  const storedPaidAmount = Number(receipt.paid_amount ?? 0);
  const calculatedPaidAmount = Math.max(0, Number(originalTotal || 0) - writtenOffAmount - remainingPayable);
  const amountPaid = storedPaidAmount > 0 ? storedPaidAmount : calculatedPaidAmount;
  const row = (label, value, options = {}) => `
    <tr>
      <th style="width:52%;padding:11px 12px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px;color:${options.danger ? '#dc2626' : '#0f172a'};font-weight:800;">${escapeHtml(label)}</th>
      <td style="padding:11px 12px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px;color:${options.danger ? '#dc2626' : '#0f172a'};font-weight:${options.bold ? '800' : '500'};">${value}</td>
    </tr>`;

  element.style.cssText = 'width:760px;background:#fff;color:#0f172a;font-family:Arial,sans-serif;padding:32px;box-sizing:border-box;';
  element.innerHTML = `
    <div style="border:1px solid #cfd9e6;border-radius:12px;padding:28px 30px;max-width:620px;margin:0 auto;background:white;">
      <div style="margin-bottom:20px;">
        <h1 style="margin:0;color:#0f172a;font-size:26px;line-height:1.2;">Payment Receipt</h1>
        <p style="margin:4px 0 0;color:#0f172a;font-size:13px;">${escapeHtml(settings.societyName || 'Society Management System')}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          ${row('Bill No.', escapeHtml(billNumber), { bold: true })}
          ${row('Resident', escapeHtml(resident))}
          ${row('Flat', escapeHtml(receipt.flat_no || '-'))}
          ${row('Flat Type', escapeHtml(receipt.flat_type_name || 'Not Assigned'))}
          ${row('Period', escapeHtml(billingPeriod(receipt)))}
          ${row('Due Date', formatDate(receipt.due_date))}
          ${row('Status', escapeHtml(receipt.write_off_status || receipt.payment_status || 'Written Off'))}
          ${row('Base Maintenance Charge', amountRs(baseAmount))}
          ${row('Original Late Fee', amountRs(lateFee))}
          ${row('Original Total Bill', amountRs(originalTotal))}
          ${maintenanceWrittenOff > 0 ? row('Maintenance Written Off', `-${amountRs(maintenanceWrittenOff)}`, { danger: true }) : ''}
          ${penaltyWrittenOff > 0 ? row('Penalty Written Off', `-${amountRs(penaltyWrittenOff)}`, { danger: true }) : ''}
          ${row('Amount Paid', amountRs(amountPaid))}
        </tbody>
      </table>
      <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e5e7eb;margin-top:4px;padding:18px 12px 4px;">
        <strong style="font-size:22px;color:#0f172a;">Remaining Payable</strong>
        <strong style="font-size:24px;color:#0f172a;">${amountRs(remainingPayable)}</strong>
      </div>
      <p style="margin:14px 0 0;text-align:right;color:#0f172a;font-size:12px;">Generated on ${new Date().toLocaleString('en-IN')}</p>
    </div>`;
  return element;
};

export const printWriteOffReceipt = (receipt, settings) => {
  const element = createWriteOffReceiptElement(receipt, settings);
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) throw new Error('Popup blocked');
  printWindow.document.write(`<!doctype html><html><head><title>Payment Receipt</title><style>@page{margin:12mm}body{margin:0;background:#fff}*{box-sizing:border-box}</style></head><body>${element.outerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
};

export const downloadWriteOffReceiptPdf = async (receipt, settings) => {
  const element = createWriteOffReceiptElement(receipt, settings);
  element.style.width = '760px';
  element.style.background = '#fff';
  element.style.color = '#172033';
  element.style.fontFamily = 'Arial,sans-serif';
  element.style.padding = '32px';
  element.style.boxSizing = 'border-box';

  const billNumber = receipt.bill_number || `BILL-${receipt.bill_id || receipt.id}`;
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = Math.max(0, Number(receipt.month || 1) - 1);
  const shortMonth = shortMonths[monthIdx];
  const year = receipt.year || new Date().getFullYear();
  const filename = `Receipt_${billNumber}_${shortMonth}-${year}.pdf`;

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf().set({
      margin: 8,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element.outerHTML).save();
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};
