-- Migration 0073: Police portal gets the admin inventory view (read-only)
-- Grants police_user the existing inventory:view permission (already held
-- by super_admin/admin/allotment_staff) so the "All Booths/Stalls" nav item
-- (/admin/inventory) works for them — per explicit request (2026-11-03):
-- the police portal should reuse the admin panel's UI/pages directly, not
-- a separate build. inventory:manage (add/edit/delete/import) is NOT
-- granted — police only ever gets read/export access here, matching the
-- existing "police:view is intentionally scoped narrower" pattern already
-- documented elsewhere in this codebase (see the police:view scoping
-- comment on /api/documents/[id]/preview).

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.`key` = 'police_user'
  AND p.`key` = 'inventory:view'
ON DUPLICATE KEY UPDATE role_id = role_id;
