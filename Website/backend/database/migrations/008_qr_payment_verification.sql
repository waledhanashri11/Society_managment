ALTER TABLE maintenance
  DROP CONSTRAINT IF EXISTS maintenance_status_check;

ALTER TABLE maintenance
  ADD CONSTRAINT maintenance_status_check
  CHECK (status IN ('Paid', 'Pending', 'Overdue', 'Under Review', 'Pending Verification', 'Rejected', 'Partial'));

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_payment_status_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_payment_status_check
  CHECK (payment_status IN ('Pending', 'Under Review', 'Pending Verification', 'Paid', 'Rejected'));

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_verified_by ON payments(verified_by);
