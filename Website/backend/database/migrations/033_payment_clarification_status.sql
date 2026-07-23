-- Allow admins to request clarification without approving or rejecting a payment.
-- Existing payment and maintenance rows are preserved.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_status_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_payment_status_check
  CHECK (payment_status IN (
    'Pending', 'Under Review', 'Pending Verification', 'Needs Clarification',
    'Approved', 'Paid', 'Rejected'
  ));

ALTER TABLE maintenance DROP CONSTRAINT IF EXISTS maintenance_status_check;
ALTER TABLE maintenance
  ADD CONSTRAINT maintenance_status_check
  CHECK (status IN (
    'Pending', 'Pending Verification', 'Needs Clarification', 'Under Review',
    'Partial', 'Paid', 'Overdue', 'Rejected', 'Waived', 'Written Off',
    'SETTLED', 'WRITTEN_OFF', 'PARTIAL_WRITE_OFF', 'Cancelled'
  ));
