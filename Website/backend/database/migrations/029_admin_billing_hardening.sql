-- Safe admin billing hardening. Existing maintenance/payment rows are preserved.
ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS penalty_type VARCHAR(20);
ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS penalty_value NUMERIC(10, 2);
ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS penalty_grace_days INTEGER;

-- Keep legacy title-case statuses accepted while allowing the verification flow.
ALTER TABLE maintenance DROP CONSTRAINT IF EXISTS maintenance_status_check;
ALTER TABLE maintenance
  ADD CONSTRAINT maintenance_status_check
  CHECK (status IN (
    'Pending', 'Pending Verification', 'Under Review', 'Partial', 'Paid',
    'Overdue', 'Rejected', 'Waived', 'Written Off', 'SETTLED',
    'WRITTEN_OFF', 'PARTIAL_WRITE_OFF'
  ));

-- NULL rows are excluded because manual/admin records without an assignment
-- must remain insertable; assigned bills are unique per resident/flat/cycle.
CREATE UNIQUE INDEX IF NOT EXISTS uq_maintenance_resident_flat_cycle
  ON maintenance (resident_id, flat_id, month, year)
  WHERE resident_id IS NOT NULL AND flat_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_cycle ON maintenance (year, month);
CREATE INDEX IF NOT EXISTS idx_maintenance_due_date ON maintenance (due_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments (transaction_id);
