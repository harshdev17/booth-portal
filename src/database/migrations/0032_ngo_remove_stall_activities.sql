-- Migration 0032: NGO form no longer asks "Stall Activities" (client request).
-- Retired, not deleted, so answers stored on earlier applications still show.

UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations')
  AND field_key = 'proposed_stall_activities';
