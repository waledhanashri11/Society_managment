-- Super Admin accounts are platform-scoped and intentionally have no society.
ALTER TABLE users ALTER COLUMN society_id DROP NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_society_scope_check;
ALTER TABLE users ADD CONSTRAINT users_role_society_scope_check CHECK (
  (role = 'super_admin' AND society_id IS NULL)
  OR
  (role <> 'super_admin' AND society_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_designated_super_admin
  ON users (role) WHERE role = 'super_admin';

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_case_insensitive
  ON users (LOWER(email));
