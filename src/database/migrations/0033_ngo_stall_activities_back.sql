-- Migration 0033: NGO form asks again what the organisation will do at the
-- stall (removed in 0032), now worded as a plain question.

SET NAMES utf8mb4;

UPDATE category_field_definitions
SET status = 'active', is_required = 1,
    label = 'What will you do at the stall?',
    label_hi = 'आप स्टॉल पर क्या करेंगे?',
    input_type = 'text', max_length = 255,
    display_order = 5, section = 'Stall Details', section_hi = 'स्टॉल का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations')
  AND field_key = 'proposed_stall_activities';
