ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_status_check;

UPDATE users
SET status = 'approved'
WHERE status IS NULL OR status NOT IN ('pending', 'approved', 'rejected');

ALTER TABLE users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
