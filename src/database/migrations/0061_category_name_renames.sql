-- Migration 0061: Rename two category display names per explicit instruction.
-- 1. "Refreshment & Food Stalls" -> "Refreshment and Ice Cream Booth/Stall"
-- 2. "Sweets and Bakers (Special Items)" -> "Sweets, Bakers and Special Food Items"
-- (slug values are unchanged — only the categories.name/name_hi display strings.)
UPDATE categories SET
  name = 'Refreshment and Ice Cream Booth/Stall',
  name_hi = 'जलपान एवं आइसक्रीम बूथ/स्टॉल'
WHERE slug = 'refreshment-stalls';

UPDATE categories SET
  name = 'Sweets, Bakers and Special Food Items',
  name_hi = 'मिष्ठान, बेकर्स एवं विशेष खाद्य वस्तुएं'
WHERE slug = 'sweets-special-items';
