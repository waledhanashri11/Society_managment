ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payments_rejected_by ON payments(rejected_by);
CREATE INDEX IF NOT EXISTS idx_payments_rejected_at ON payments(rejected_at);
