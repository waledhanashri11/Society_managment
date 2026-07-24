-- 030_noc_module_upgrade.sql
-- Comprehensive upgrade for NOC (No Objection Certificate) module

-- 1. Ensure required columns in noc_requests
ALTER TABLE noc_requests ADD COLUMN IF NOT EXISTS required_date DATE;
ALTER TABLE noc_requests ADD COLUMN IF NOT EXISTS contact_number VARCHAR(30);
ALTER TABLE noc_requests ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Update status check constraint on noc_requests to include all required lifecycle statuses
ALTER TABLE noc_requests DROP CONSTRAINT IF EXISTS noc_requests_status_check;
ALTER TABLE noc_requests ADD CONSTRAINT noc_requests_status_check CHECK (status IN ('Submitted', 'Under Review', 'Additional Information Required', 'Approved', 'Rejected', 'Completed', 'Pending'));

-- 2. Expand seed NOC types
INSERT INTO noc_types (name, description, active)
VALUES
  ('Property Sale', 'NOC for property sale and ownership transfer.', TRUE),
  ('Rental', 'NOC for renting out flat to tenants.', TRUE),
  ('Bank Loan', 'NOC required for bank or financial institution loan processing.', TRUE),
  ('Renovation', 'NOC for interior or structural renovation permission.', TRUE),
  ('Parking', 'NOC for vehicle parking space allocation or verification.', TRUE),
  ('Water Connection', 'NOC for individual or new water connection.', TRUE),
  ('Electricity Connection', 'NOC for meter transfer or new electricity connection.', TRUE),
  ('General NOC', 'General purpose society No Objection Certificate.', TRUE)
ON CONFLICT (name) DO NOTHING;
