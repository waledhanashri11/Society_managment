INSERT INTO society_rules (title, description, category, display_order, is_pinned, is_active)
SELECT title, description, category, display_order, is_pinned, TRUE
FROM (
  VALUES
    ('Respect Other Residents', 'All residents shall maintain peace, harmony, and mutual respect within the society.', 'General Rules', 1, TRUE),
    ('Use Society Property Responsibly', 'Society property and common facilities must be used carefully and responsibly.', 'General Rules', 2, FALSE),
    ('Follow Society Decisions', 'Residents must comply with resolutions and notices issued by the Society Committee.', 'General Rules', 3, FALSE),
    ('Report Property Damage', 'Any damage to common property should be reported immediately to the management.', 'General Rules', 4, FALSE),
    ('Park in Allotted Space', 'Vehicles must be parked only in the allotted parking space.', 'Parking Rules', 5, TRUE),
    ('Visitor Parking', 'Visitors must use designated visitor parking areas.', 'Parking Rules', 6, FALSE),
    ('Do Not Block Roads', 'Do not block gates, emergency exits, driveways, or fire lanes.', 'Parking Rules', 7, FALSE),
    ('Quiet Hours', 'Loud music and parties are not permitted between 10:00 PM and 6:00 AM.', 'Noise Rules', 8, TRUE),
    ('Avoid Disturbance', 'Avoid unnecessary noise in corridors, parking areas, and common spaces.', 'Noise Rules', 9, FALSE),
    ('Renovation Timing', 'Construction and renovation work is allowed only during society-approved hours.', 'Noise Rules', 10, FALSE),
    ('Waste Segregation', 'Separate wet and dry waste before disposal.', 'Cleanliness Rules', 11, FALSE),
    ('No Littering', 'Do not litter or throw garbage in common areas.', 'Cleanliness Rules', 12, FALSE),
    ('No Balcony Throwing', 'Do not throw garbage, water, or any objects from balconies or windows.', 'Cleanliness Rules', 13, FALSE),
    ('Pets on Leash', 'Pets must remain on a leash in all common areas.', 'Pet Policy', 14, FALSE),
    ('Clean After Pets', 'Pet owners must clean up after their pets.', 'Pet Policy', 15, FALSE),
    ('Visitor Registration', 'All visitors must register with security before entering the society.', 'Security Rules', 16, TRUE),
    ('Cooperate With Security', 'Residents should cooperate with security personnel during verification.', 'Security Rules', 17, FALSE),
    ('Pay Maintenance On Time', 'Maintenance charges should be paid before the due date.', 'Maintenance Rules', 18, TRUE),
    ('Report Maintenance Issues', 'Maintenance problems should be reported through the Society Management System.', 'Maintenance Rules', 19, FALSE),
    ('Approval for Renovation', 'Major renovation work requires prior approval from the Society Committee.', 'Maintenance Rules', 20, FALSE),
    ('Use Amenities Responsibly', 'Common facilities should be used responsibly and kept clean after use.', 'Common Amenities', 21, FALSE),
    ('Supervise Children', 'Children should always be supervised while using common facilities.', 'Common Amenities', 22, FALSE),
    ('Keep Emergency Exits Clear', 'Fire exits and emergency access routes must remain unobstructed.', 'Safety Rules', 23, FALSE),
    ('Report Emergencies', 'Immediately report fire, gas leaks, or suspicious activities to society management.', 'Safety Rules', 24, FALSE),
    ('Society Rule Violations', 'Repeated violations may result in penalties as decided by the Managing Committee.', 'Penalties', 25, FALSE),
    ('Damage Recovery', 'Residents are responsible for the repair cost of any damage caused to society property.', 'Penalties', 26, FALSE)
) AS default_rules(title, description, category, display_order, is_pinned)
WHERE NOT EXISTS (SELECT 1 FROM society_rules);
