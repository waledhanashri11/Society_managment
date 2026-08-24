ALTER TABLE societies
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata';

UPDATE societies SET timezone = 'Asia/Kolkata' WHERE timezone IS NULL OR BTRIM(timezone) = '';

