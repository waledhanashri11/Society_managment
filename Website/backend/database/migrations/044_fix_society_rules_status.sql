-- Migration 044: Fix society rules status and seed missing data for all tenants.

-- 1. Ensure all existing active rules are published (not stuck in draft).
UPDATE society_rules
SET status = 'published',
    published_at = COALESCE(published_at, created_at, NOW())
WHERE is_active = TRUE
  AND (status IS NULL OR status = '' OR status = 'draft');

-- 2. Ensure all existing inactive rules are archived (not stuck in draft).
UPDATE society_rules
SET status = 'archived',
    archived_at = COALESCE(archived_at, NOW())
WHERE is_active = FALSE
  AND (status IS NULL OR status = '' OR status = 'draft');

-- 3. Ensure the rules_version setting exists for every active society.
INSERT INTO app_settings (setting_key, setting_value, society_id)
SELECT 'rules_version', '1', s.id
FROM societies s
WHERE NOT EXISTS (
  SELECT 1 FROM app_settings a
  WHERE a.setting_key = 'rules_version' AND a.society_id = s.id
)
ON CONFLICT (society_id, setting_key) DO NOTHING;
