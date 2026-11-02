-- Migration 0072: Admin-editable application data
-- Adds 'application:edit' permission — lets an authorized admin correct an
-- applicant's submitted form data (name, address, contact details, etc.)
-- and re-upload/replace documents on their behalf, directly from the admin
-- panel, per explicit request (2026-11-03). Deliberately scoped to
-- super_admin and admin only (not allotment_staff/verification_staff) —
-- this edits an applicant's own submitted record, a more sensitive
-- capability than approving/rejecting or verifying documents.

INSERT INTO permissions (`key`, description) VALUES
  ('application:edit', 'Edit an applicant''s submitted form data and documents from the admin panel')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.`key` IN ('super_admin', 'admin')
  AND p.`key` = 'application:edit'
ON DUPLICATE KEY UPDATE role_id = role_id;
