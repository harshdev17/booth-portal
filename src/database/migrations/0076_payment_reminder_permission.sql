-- Migration 0076: dedicated permission for sending payment reminders
-- Previously "Send Payment Reminder" (single and bulk) was gated by
-- `application:view`, meaning any account that could merely VIEW
-- applications could also send WhatsApp/email payment reminders to
-- applicants — too broad for a staff account scoped to read-only viewing.
-- Reported live, 2026-11-10: a staff account given only 'View applications'
-- could still see and use the Send Payment Reminder button.
--
-- Granted here to super_admin only, preserving its existing ability
-- (every other role/account must have it granted explicitly from the
-- Permission Matrix, including admin — reminders are now an opt-in action,
-- not a byproduct of being able to view applications).

INSERT INTO permissions (`key`, description) VALUES
  ('payment:reminder', 'Send a payment reminder (WhatsApp/email) to an applicant')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.`key` = 'super_admin'
  AND p.`key` = 'payment:reminder'
ON DUPLICATE KEY UPDATE role_id = role_id;
