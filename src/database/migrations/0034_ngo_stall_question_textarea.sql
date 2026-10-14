-- Migration 0034: NGO "What will you do at the booth/stall?" is a multi-line
-- text field (was a single-line box).

UPDATE category_field_definitions
SET input_type = 'textarea', max_length = 512
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations')
  AND field_key = 'proposed_stall_activities';
