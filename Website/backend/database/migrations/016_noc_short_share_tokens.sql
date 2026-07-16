ALTER TABLE noc_requests
  ADD COLUMN IF NOT EXISTS share_token VARCHAR(32),
  ADD COLUMN IF NOT EXISTS share_token_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_token_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_noc_requests_share_token
  ON noc_requests(share_token)
  WHERE share_token IS NOT NULL;
