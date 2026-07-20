ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS in_progress_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopened_comment TEXT;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT constraint_name
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'complaints' AND column_name = 'status'
    LOOP
        EXECUTE 'ALTER TABLE complaints DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE complaints ADD CONSTRAINT complaints_status_check CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed'));
