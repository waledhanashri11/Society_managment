CREATE TABLE IF NOT EXISTS resident_flat_assignments (
  id SERIAL PRIMARY KEY,
  flat_id INTEGER REFERENCES flats(id) ON DELETE CASCADE,
  resident_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Ensure only one active assignment exists per flat
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_flat_assignment ON resident_flat_assignments (flat_id) WHERE is_active = TRUE;

-- Populate initial active assignments from currently occupied flats
INSERT INTO resident_flat_assignments (flat_id, resident_id, start_date, is_active)
SELECT id, owner_id, NOW(), TRUE
FROM flats
WHERE owner_id IS NOT NULL AND status = 'Occupied'
ON CONFLICT DO NOTHING;
