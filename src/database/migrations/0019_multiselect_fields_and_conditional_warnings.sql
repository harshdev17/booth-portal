-- Migration 0019: Adds a 'multiselect' input_type (true checkbox-group
-- fields, e.g. "Areas of Social Work", "Expected Requirements",
-- "Proposed Promotional Activities", "Products Made by SHG", "Product
-- Category") and converts the fields from migration 0018 that were seeded
-- as single-select placeholders (because multiselect didn't exist yet) into
-- real multiselect fields.
--
-- Storage: a multiselect value is stored as the same VARCHAR(1024)
-- categoryFieldValueSchema already allows, as a comma-joined list of option
-- values (e.g. "education,health,other") — no DB/schema shape change needed
-- beyond the enum, since category_field_definitions.options_json already
-- carries the valid option set to validate the list against.

ALTER TABLE category_field_definitions
  MODIFY COLUMN input_type ENUM('text', 'textarea', 'select', 'radio', 'multiselect') NOT NULL;

-- Convert previously-seeded single-select placeholders to real multiselect
UPDATE category_field_definitions SET input_type = 'multiselect' WHERE field_key = 'area_of_social_work';
UPDATE category_field_definitions SET input_type = 'multiselect' WHERE field_key = 'expected_requirements';
UPDATE category_field_definitions SET input_type = 'multiselect' WHERE field_key = 'proposed_promotional_activities';
UPDATE category_field_definitions SET input_type = 'multiselect' WHERE field_key = 'products_made' AND category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups' LIMIT 1);
