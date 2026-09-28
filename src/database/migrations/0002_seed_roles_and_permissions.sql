-- Migration 0002: Seed roles and permission catalogue per .ai/RBAC.md Section 2-3.
-- Role -> permission assignments follow the documented matrix. Cells marked
-- [TBC] there are seeded conservatively (denied) here; grant explicitly via
-- the Roles & Permissions admin module once confirmed with KDB.

INSERT INTO roles (`key`, name, description, is_system) VALUES
  ('super_admin', 'Super Admin', 'Full system access, including configuration and user/role management.', 1),
  ('admin', 'Admin', 'Operational administrator across applications, payments, inventory, draw, and allotment.', 1),
  ('allotment_staff', 'Allotment Staff', 'Runs draw and allotment operations; scoped inventory/application access.', 1),
  ('verification_staff', 'Verification Staff', 'Verifies applicant documents; scoped application/document access.', 1),
  ('reports_readonly', 'Reports / Read-only Staff', 'Read-only access to reports and dashboards.', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO permissions (`key`, description) VALUES
  ('application:view', 'View application list/detail'),
  ('application:approve', 'Mark an application Selected'),
  ('application:reject', 'Mark an application Rejected'),
  ('application:cancel', 'Cancel an allotment/application'),
  ('document:view', 'View/download uploaded documents'),
  ('document:verify', 'Verify/reject/query a document'),
  ('payment:view', 'View payment records'),
  ('payment:reconcile', 'Perform reconciliation actions'),
  ('payment:refund', 'Initiate a refund'),
  ('payment:activate_paynow', 'Activate pay-now for an applicant'),
  ('inventory:view', 'View inventory'),
  ('inventory:manage', 'Add/edit/block inventory units'),
  ('draw:run', 'Trigger a draw'),
  ('draw:view', 'View draw results'),
  ('allotment:perform', 'Allot a shop to an applicant'),
  ('allotment:reallot', 'Re-allot a reclaimed shop'),
  ('qr:decode', 'Resolve a QR token to allotment details'),
  ('qr:revoke', 'Revoke a QR/allotment token'),
  ('report:view', 'View reports/dashboards'),
  ('report:export', 'Export reports (Excel/CSV/PDF)'),
  ('config:manage', 'Change system configuration'),
  ('user:manage', 'Create/edit admin users'),
  ('role:manage', 'Create/edit roles and permission assignments'),
  ('audit:view', 'View audit logs')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Super Admin: every permission.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.`key` = 'super_admin'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Admin: everything except role:manage and user:manage (Super Admin only per RBAC.md).
-- config:manage/payment:refund/inventory:manage marked [TBC] in RBAC.md are
-- granted here as a working default since Admin is the primary operational
-- role; revisit if KDB confirms otherwise.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.`key` = 'admin'
  AND p.`key` NOT IN ('role:manage', 'user:manage')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Allotment Staff: inventory/draw/allotment operational scope.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.`key` = 'allotment_staff'
  AND p.`key` IN (
    'application:view', 'inventory:view', 'draw:run', 'draw:view',
    'allotment:perform', 'report:view'
  )
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Verification Staff: document verification scope.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.`key` = 'verification_staff'
  AND p.`key` IN ('application:view', 'document:view', 'document:verify', 'report:view')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Reports / Read-only: view-only across the board, per RBAC.md.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.`key` = 'reports_readonly'
  AND p.`key` IN ('application:view', 'payment:view', 'inventory:view', 'draw:view', 'report:view')
ON DUPLICATE KEY UPDATE role_id = role_id;
