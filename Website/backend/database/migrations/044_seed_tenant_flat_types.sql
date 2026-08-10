-- Give every tenant the same starting flat-type catalogue as Mahalaxmi,
-- while preserving tenant-specific additions and edits already made.
INSERT INTO flat_types (society_id, name, default_maintenance_amount, description, status)
SELECT target.id, template.name, template.default_maintenance_amount, template.description, template.status
FROM societies AS target
JOIN flat_types AS template ON template.society_id = 1
LEFT JOIN flat_types AS existing
  ON existing.society_id = target.id
 AND LOWER(existing.name) = LOWER(template.name)
WHERE existing.id IS NULL;
