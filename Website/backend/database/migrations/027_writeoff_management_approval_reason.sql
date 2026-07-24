ALTER TABLE maintenance_writeoffs
  DROP CONSTRAINT IF EXISTS maintenance_writeoffs_reason_check;

ALTER TABLE maintenance_writeoffs
  ADD CONSTRAINT maintenance_writeoffs_reason_check
  CHECK (reason IN ('Billing Error', 'Financial Assistance', 'Society Decision', 'Management Approval', 'Special Approval', 'Other'));
