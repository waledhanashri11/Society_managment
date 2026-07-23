-- Allow resident/admin NOC cancellation without touching existing requests.
ALTER TABLE noc_requests DROP CONSTRAINT IF EXISTS noc_requests_status_check;

ALTER TABLE noc_requests
  ADD CONSTRAINT noc_requests_status_check
  CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Rejected', 'Cancelled'));
