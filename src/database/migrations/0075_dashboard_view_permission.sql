-- Migration 0075: Dashboard access control
-- Adds 'dashboard:view' permission — previously the Admin Dashboard
-- (/admin/dashboard) had no permission gate at all: any logged-in staff
-- account could open it, and it also unconditionally showed links to
-- permission-gated features (Draw, Inventory) that crashed when clicked by
-- an account without that specific permission (fixed separately the same
-- day by making those cards/links conditional). Per explicit request
-- (2026-11-10): "yahan pe dashboard access dena ya nahi ye option kahan
-- hai" — there needs to be an actual on/off switch for dashboard access
-- itself, not just for what's shown inside it.
--
-- Granted to super_admin and police_user here so neither account's current
-- access changes (police_user's dashboard view was already effectively
-- in use) — every other existing/future role must have it granted
-- explicitly from the Permission Matrix, same as any other permission.

INSERT INTO permissions (`key`, description) VALUES
  ('dashboard:view', 'View the Admin Dashboard overview page')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.`key` IN ('super_admin', 'police_user')
  AND p.`key` = 'dashboard:view'
ON DUPLICATE KEY UPDATE role_id = role_id;
