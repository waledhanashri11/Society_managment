ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS complaint_images JSONB NOT NULL DEFAULT '[]'::jsonb;
