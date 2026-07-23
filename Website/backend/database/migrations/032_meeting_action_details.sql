-- Add action-item details required by the Android meeting tracker.
ALTER TABLE meeting_actions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE meeting_actions ADD COLUMN IF NOT EXISTS completion_details TEXT;
ALTER TABLE meeting_actions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_meeting_actions_assigned_to ON meeting_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_meeting_actions_status ON meeting_actions(status);
