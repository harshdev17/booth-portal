-- Migration 0035: SHG form — "SHG Address Category" is asked right before
-- "SHG Address" (was first in the section).

UPDATE category_field_definitions SET display_order = CASE field_key
    WHEN 'shg_name' THEN 1
    WHEN 'shg_registration_number' THEN 2
    WHEN 'registration_date' THEN 3
    WHEN 'shg_location_category' THEN 4
    WHEN 'shg_location' THEN 5
    WHEN 'shg_member_count' THEN 6
  END
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups')
  AND field_key IN ('shg_name', 'shg_registration_number', 'registration_date', 'shg_location_category', 'shg_location', 'shg_member_count');
