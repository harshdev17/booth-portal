-- Migration 0031: Brand Promotion form asks PAN Number, then GST Number,
-- then Registration Number (was Registration Number first).

UPDATE category_field_definitions SET display_order = 5
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'pan_number';
UPDATE category_field_definitions SET display_order = 6
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'gst_number';
UPDATE category_field_definitions SET display_order = 7
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'registration_number';
