ALTER TABLE flats
  ADD COLUMN IF NOT EXISTS wing VARCHAR(20) NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Available';

ALTER TABLE flats
  DROP CONSTRAINT IF EXISTS flats_status_check;

ALTER TABLE flats
  ADD CONSTRAINT flats_status_check
  CHECK (status IN ('Available', 'Occupied'));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS flat_id INTEGER REFERENCES flats(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_flat_id_unique
  ON users(flat_id)
  WHERE flat_id IS NOT NULL AND role = 'resident';

CREATE INDEX IF NOT EXISTS idx_users_flat_id ON users(flat_id);

UPDATE users u
SET flat_id = f.id
FROM flats f
WHERE f.owner_id = u.id
  AND u.role = 'resident'
  AND u.flat_id IS NULL;

UPDATE flats f
SET owner_id = u.id,
    status = 'Occupied'
FROM users u
WHERE u.flat_id = f.id
  AND u.role = 'resident';

UPDATE flats
SET owner_id = NULL,
    status = 'Available'
WHERE owner_id IS NULL
  AND status <> 'Available';
