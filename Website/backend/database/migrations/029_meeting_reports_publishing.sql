-- 029_meeting_reports_publishing.sql
-- Enhanced schema columns for Published MoM Meeting Reports module

ALTER TABLE meeting_reports ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE meeting_reports ADD COLUMN IF NOT EXISTS prepared_by VARCHAR(255);
ALTER TABLE meeting_reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Update status constraint on meeting_actions if needed
ALTER TABLE meeting_actions ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255);
