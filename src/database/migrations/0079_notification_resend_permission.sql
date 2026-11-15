-- Migration 0079: Admin-triggered resend of a failed WhatsApp/Email
-- notification. Adds 'notification:resend' — distinct from the existing
-- 'audit:view' used to VIEW the new Notification Logs page, since resending
-- is a write action that sends a real message to an applicant (same
-- read/write permission split already used elsewhere: payment:view vs
-- payment:reminder, document:view vs document:verify). Scoped to
-- super_admin and admin only, matching application:edit's precedent — this
-- directly contacts applicants on the organisation's behalf, a more
-- sensitive capability than viewing the log itself.
INSERT INTO permissions (`key`, description) VALUES
  ('notification:resend', 'Resend a failed WhatsApp/Email notification to an applicant')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.`key` IN ('super_admin', 'admin')
  AND p.`key` = 'notification:resend'
ON DUPLICATE KEY UPDATE role_id = role_id;
