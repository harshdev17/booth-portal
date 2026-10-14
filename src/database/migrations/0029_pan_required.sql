-- Migration 0029: PAN Number is required in every form that asks for it
-- (Refreshment, Wooden Craft, Brand Promotion). Format validation is enforced
-- in code (lib/applications/pan.ts), not in the database.

UPDATE category_field_definitions SET is_required = 1 WHERE field_key = 'pan_number';
