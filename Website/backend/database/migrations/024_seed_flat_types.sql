-- Seed default Flat Types into flat_types table
INSERT INTO flat_types (name, default_maintenance_amount, description, status)
VALUES 
  ('1RK', 1200.00, 'Single Room Kitchen apartment unit', 'Active'),
  ('1BHK', 1800.00, 'Standard 1 Bedroom Hall Kitchen apartment unit', 'Active'),
  ('2BHK', 2500.00, 'Standard 2 Bedroom Hall Kitchen apartment unit', 'Active'),
  ('3BHK', 3500.00, 'Premium 3 Bedroom Hall Kitchen apartment unit', 'Active'),
  ('4BHK', 4800.00, 'Luxury 4 Bedroom Hall Kitchen apartment unit', 'Active'),
  ('Shop', 2000.00, 'Commercial retail shop space', 'Active'),
  ('Office', 3000.00, 'Commercial office or workstation space', 'Active'),
  ('Villa', 6000.00, 'Independent house or villa block unit', 'Active'),
  ('Penthouse', 7500.00, 'Top-tier luxury penthouse unit with terrace', 'Active')
ON CONFLICT (name) DO NOTHING;
