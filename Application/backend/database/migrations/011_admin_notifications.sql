-- Insert initial notifications for existing pending/in-progress complaints for all approved admins
INSERT INTO notifications (resident_id, title, message, type, is_read, created_at)
SELECT u.id, 'New complaint needs attention', CONCAT('Complaint: ', c.title), 'complaints', FALSE, c.created_at
FROM complaints c
CROSS JOIN users u
WHERE u.role = 'admin' AND u.status = 'approved' AND c.status IN ('pending', 'in_progress')
AND NOT EXISTS (
  SELECT 1 FROM notifications n
  WHERE n.resident_id = u.id
    AND n.type = 'complaints'
    AND n.message = CONCAT('Complaint: ', c.title)
);

-- Insert initial notifications for existing pending verification payments for all approved admins
INSERT INTO notifications (resident_id, title, message, type, is_read, created_at)
SELECT u.id, 'Pending payment verification', CONCAT('Verify payment of UTR: ', p.transaction_id), 'maintenance', FALSE, p.created_at
FROM payments p
CROSS JOIN users u
WHERE u.role = 'admin' AND u.status = 'approved' AND p.payment_status = 'Pending Verification'
AND NOT EXISTS (
  SELECT 1 FROM notifications n
  WHERE n.resident_id = u.id
    AND n.type = 'maintenance'
    AND n.message = CONCAT('Verify payment of UTR: ', p.transaction_id)
);
