-- Tenant-first indexes for the authenticated dashboard and high-traffic lists.
-- Keep society_id first so PostgreSQL can prune another tenant's rows before
-- applying user/status/date filters.
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_resident_created
  ON maintenance(society_id, resident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_status_due
  ON maintenance(society_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_bill_status
  ON payments(society_id, bill_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_notices_tenant_created
  ON notices(society_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_tenant_user_created
  ON complaints(society_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_tenant_status_created
  ON complaints(society_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_tenant_date
  ON meetings(society_id, meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_noc_requests_tenant_status_created
  ON noc_requests(society_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_society_rules_tenant_active_order
  ON society_rules(society_id, is_active, is_pinned DESC, display_order);
