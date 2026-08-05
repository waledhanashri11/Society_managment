-- Migration 039: Add manual bill fields to maintenance table
ALTER TABLE maintenance
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bill_type VARCHAR(50) DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_maintenance_bill_type ON maintenance(bill_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_is_manual ON maintenance(is_manual);
