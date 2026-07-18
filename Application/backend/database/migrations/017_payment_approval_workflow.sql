ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_proof TEXT;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_payment_status_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_payment_status_check
  CHECK (payment_status IN ('Pending', 'Under Review', 'Pending Verification', 'Approved', 'Paid', 'Rejected'));

CREATE TABLE IF NOT EXISTS payment_maintenance (
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  maintenance_id INTEGER NOT NULL REFERENCES maintenance(id) ON DELETE CASCADE,
  PRIMARY KEY (payment_id, maintenance_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_maintenance_payment_id ON payment_maintenance(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_maintenance_maintenance_id ON payment_maintenance(maintenance_id);
