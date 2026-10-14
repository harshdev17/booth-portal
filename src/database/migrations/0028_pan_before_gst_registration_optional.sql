-- Migration 0028: client follow-up on the form review.
--  * PAN Number is asked before GST Number in every form that has both
--    (Wooden Craft, Brand; Refreshment already did).
--  * GST Number is always labelled "GST Number, if applicable".
--  * Registration numbers are optional in every form.

SET NAMES utf8mb4;

-- Order: PAN before GST
UPDATE category_field_definitions SET display_order = 3
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'pan_number';
UPDATE category_field_definitions SET display_order = 4
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'gst_number';

UPDATE category_field_definitions SET display_order = 6
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'pan_number';
UPDATE category_field_definitions SET display_order = 7
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'gst_number';

-- GST label, everywhere
UPDATE category_field_definitions
SET label = 'GST Number, if applicable', label_hi = 'जीएसटी नंबर, यदि लागू हो', is_required = 0
WHERE field_key = 'gst_number';

-- Registration numbers optional, everywhere
UPDATE category_field_definitions SET is_required = 0
WHERE field_key IN ('ngo_registration_number', 'shg_registration_number', 'business_registration_number', 'registration_number');
