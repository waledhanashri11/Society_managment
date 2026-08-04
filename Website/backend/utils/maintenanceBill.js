const money = (value) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const firstMoney = (...values) => {
  const value = values.find((candidate) => candidate !== null && candidate !== undefined && String(candidate).trim() !== '');
  return money(value);
};

const calculateMaintenanceBill = (bill = {}, options = {}) => {
  const baseAmount = firstMoney(bill.baseAmount, bill.base_amount, bill.maintenanceAmount,
    bill.maintenance_amount, bill.original_amount, bill.originalAmount, bill.amount);
  const penaltyAmount = firstMoney(bill.penaltyAmount, bill.penalty_amount, bill.late_fee, bill.penalty);
  const grossAmount = baseAmount + penaltyAmount;

  const approvedMaintenanceWriteOff = firstMoney(
    bill.approvedMaintenanceWriteOff, bill.approved_maintenance_write_off,
    bill.maintenance_write_off_amount, bill.maintenanceWriteOffAmount
  );
  const approvedPenaltyWriteOff = firstMoney(
    bill.approvedPenaltyWriteOff, bill.approved_penalty_write_off,
    bill.penalty_write_off_amount, bill.penaltyWriteOffAmount
  );
  const splitWriteOff = approvedMaintenanceWriteOff + approvedPenaltyWriteOff;
  const totalApprovedWriteOff = splitWriteOff > 0
    ? splitWriteOff
    : firstMoney(bill.totalApprovedWriteOff, bill.total_approved_write_off, bill.write_off_amount, bill.writeOffAmount);
  const approvedPaidAmount = options.approvedPaidAmount === undefined
    ? firstMoney(bill.approvedPaidAmount, bill.approved_paid_amount, bill.paid_amount, bill.paidAmount)
    : money(options.approvedPaidAmount);
  const pendingVerificationAmount = options.pendingVerificationAmount === undefined
    ? firstMoney(bill.pendingVerificationAmount, bill.pending_verification_amount)
    : money(options.pendingVerificationAmount);
  const pendingWriteOffAmount = firstMoney(bill.pendingWriteOffAmount, bill.pending_write_off_amount);
  const netBillAmount = Math.max(0, grossAmount - totalApprovedWriteOff);
  const remainingAmount = Math.max(0, netBillAmount - approvedPaidAmount);

  let billStatus = 'UNPAID';
  if (remainingAmount <= 0) billStatus = approvedPaidAmount > 0 ? 'PAID' : 'WRITTEN_OFF';
  else if (approvedPaidAmount > 0) billStatus = 'PARTIALLY_PAID';
  else if (pendingVerificationAmount > 0) billStatus = 'PENDING_VERIFICATION';
  else if (totalApprovedWriteOff > 0) billStatus = 'PARTIAL_WRITE_OFF';

  return {
    baseAmount, penaltyAmount, grossAmount,
    approvedMaintenanceWriteOff, approvedPenaltyWriteOff, totalApprovedWriteOff,
    approvedPaidAmount, pendingVerificationAmount, pendingWriteOffAmount,
    netBillAmount, remainingAmount, billStatus,
  };
};

const withMaintenanceBillBreakdown = (bill, options) => {
  const value = calculateMaintenanceBill(bill, options);
  return {
    ...bill,
    ...value,
    base_amount: value.baseAmount,
    penalty_amount: value.penaltyAmount,
    gross_amount: value.grossAmount,
    approved_maintenance_write_off: value.approvedMaintenanceWriteOff,
    approved_penalty_write_off: value.approvedPenaltyWriteOff,
    total_approved_write_off: value.totalApprovedWriteOff,
    approved_paid_amount: value.approvedPaidAmount,
    pending_verification_amount: value.pendingVerificationAmount,
    pending_write_off_amount: value.pendingWriteOffAmount,
    net_bill_amount: value.netBillAmount,
    remaining_amount: value.remainingAmount,
    remaining_due: value.remainingAmount,
    current_due: value.remainingAmount,
    bill_status: value.billStatus,
  };
};

module.exports = { calculateMaintenanceBill, withMaintenanceBillBreakdown };
