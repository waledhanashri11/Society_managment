-- Drop the existing unique constraint on flat_no
ALTER TABLE flats DROP CONSTRAINT IF EXISTS flats_flat_no_key;

-- Add a composite unique constraint on (wing, flat_no)
ALTER TABLE flats ADD CONSTRAINT flats_wing_flat_no_key UNIQUE (wing, flat_no);
