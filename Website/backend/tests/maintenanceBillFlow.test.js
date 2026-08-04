const assert = require('assert');
const { calculateMaintenanceBill: computeBillCanonical } = require('../utils/maintenanceBill');

console.log('Running 8 Backend Maintenance Bill Flow Unit Tests...');

// Test 1: Prasad write-off
const res1 = computeBillCanonical({ amount: 2500, penalty_amount: 100, maintenance_write_off_amount: 600, paid_amount: 0 });
assert.strictEqual(res1.grossAmount, 2600, 'Test 1 Gross Failed');
assert.strictEqual(res1.netBillAmount, 2000, 'Test 1 Net Failed');
assert.strictEqual(res1.remainingAmount, 2000, 'Test 1 Remaining Failed');
console.log('✔ Test 1 (Prasad Write-Off) passed.');

// Test 2: Partial payment
const res2 = computeBillCanonical({ amount: 2500, penalty_amount: 100, maintenance_write_off_amount: 600 }, { approvedPaidAmount: 1200 });
assert.strictEqual(res2.remainingAmount, 800, 'Test 2 Remaining Failed');
assert.strictEqual(res2.billStatus, 'PARTIALLY_PAID', 'Test 2 Status Failed');
console.log('✔ Test 2 (Partial Payment) passed.');

// Test 3: Full payment
const res3 = computeBillCanonical({ amount: 2500, penalty_amount: 100, maintenance_write_off_amount: 600 }, { approvedPaidAmount: 2000 });
assert.strictEqual(res3.remainingAmount, 0, 'Test 3 Remaining Failed');
assert.strictEqual(res3.billStatus, 'PAID', 'Test 3 Status Failed');
console.log('✔ Test 3 (Full Payment) passed.');

// Test 4: Pending payment
const res4 = computeBillCanonical({ amount: 2500, penalty_amount: 100, maintenance_write_off_amount: 600 }, { approvedPaidAmount: 0, pendingVerificationAmount: 2000 });
assert.strictEqual(res4.remainingAmount, 2000, 'Test 4 Remaining Failed');
assert.strictEqual(res4.pendingVerificationAmount, 2000, 'Test 4 Pending Verif Failed');
assert.strictEqual(res4.billStatus, 'PENDING_VERIFICATION', 'Test 4 Status Failed');
console.log('✔ Test 4 (Pending Payment Submission) passed.');

// Test 5: Rejected write-off
const res5 = computeBillCanonical({ amount: 2500, penalty_amount: 100, maintenance_write_off_amount: 0 });
assert.strictEqual(res5.netBillAmount, 2600, 'Test 5 Net Failed');
assert.strictEqual(res5.remainingAmount, 2600, 'Test 5 Remaining Failed');
console.log('✔ Test 5 (Rejected Write-Off) passed.');

// Test 6: Penalty write-off
const res6 = computeBillCanonical({ amount: 2500, penalty_amount: 100, penalty_write_off_amount: 100 });
assert.strictEqual(res6.grossAmount, 2600, 'Test 6 Gross Failed');
assert.strictEqual(res6.netBillAmount, 2500, 'Test 6 Net Failed');
console.log('✔ Test 6 (Penalty Write-Off) passed.');

// Test 7: No duplicate penalty
const res7 = computeBillCanonical({ amount: 2500, penalty_amount: 100 });
assert.strictEqual(res7.grossAmount, 2600, 'Test 7 Duplicate Penalty Failed');
console.log('✔ Test 7 (No Duplicate Penalty) passed.');

// Test 8: Multiple bills
const billA = computeBillCanonical({ amount: 2500, penalty_amount: 100, maintenance_write_off_amount: 600 });
const billB = computeBillCanonical({ amount: 500, penalty_amount: 0 });
const totalDue = billA.remainingAmount + billB.remainingAmount;
assert.strictEqual(totalDue, 2500, 'Test 8 Multiple Bills Failed');
console.log('✔ Test 8 (Multiple Bills Total Due) passed.');

console.log('ALL 8 BACKEND UNIT TESTS PASSED SUCCESSFULLY!');
