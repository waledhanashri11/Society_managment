ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS resident_note TEXT;
