-- Migration 0024: Police Role and Permission Setup
-- Adds 'police_user' role to roles table if not exists
-- Adds 'police:view' permission if not exists
-- Associates 'police:view', 'document:view' to 'police_user'

INSERT INTO roles (`key`, name, description, is_system) VALUES
  ('police_user', 'Police User', 'Law enforcement and security personnel read-only access for allotted booth verification.', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO permissions (`key`, description) VALUES
  ('police:view', 'View allotted applications and verification details in Police Portal')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Grant police:view and document:view to police_user, admin, and super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.`key` IN ('police_user', 'super_admin', 'admin')
  AND p.`key` IN ('police:view', 'document:view')
ON DUPLICATE KEY UPDATE role_id = role_id;
