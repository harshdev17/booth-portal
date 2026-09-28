-- Migration 0004: Seed a working-default event + categories so the
-- application flow is testable end-to-end before KDB confirms final
-- category names/fees/documents (see .ai/OPEN_QUESTIONS.md).
--
-- THIS SEED DATA IS PROVISIONAL. Every category/fee/document/field below is
-- editable via the admin Fees/Categories/Event Settings module (once built)
-- and is not hardcoded into any application code — this migration exists
-- only to populate that configuration with a reasonable starting point
-- matching the previous year's known categories.
--
-- IMPORTANT: no bank-detail field is seeded for any category, including
-- Brand Promotion, which collected bank details in the prior-year reference
-- implementation. This is a deliberate exclusion per the 2026 requirement.

INSERT INTO events (name, slug, status) VALUES
  ('International Gita Mahotsav 2026', 'gita-mahotsav-2026', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name);

SET @event_id = (SELECT id FROM events WHERE slug = 'gita-mahotsav-2026' LIMIT 1);

INSERT INTO categories (event_id, slug, name, name_hi, selection_method, status, display_order) VALUES
  (@event_id, 'social-organizations', 'Social Organizations / NGOs', 'सामाजिक संस्थाएं', 'manual', 'open', 1),
  (@event_id, 'refreshment-stalls', 'Refreshment Stalls', 'जलपान स्टॉल', 'auction', 'open', 2),
  (@event_id, 'self-help-groups', 'Self Help Groups (SHG)', 'स्वयं सहायता समूह', 'draw', 'open', 3),
  (@event_id, 'artisan-card-holder', 'Artisan Card Holders', 'शिल्पकार कार्ड धारक', 'draw', 'open', 4),
  (@event_id, 'national-awardees', 'National Awardees', 'राष्ट्रीय पुरस्कार विजेता', 'draw', 'open', 5),
  (@event_id, 'shops-auction', 'Commercial Shops (Auction)', 'वाणिज्यिक दुकानें (नीलामी)', 'auction', 'open', 6),
  (@event_id, 'brand-promotion', 'Brand Promotion', 'ब्रांड प्रचार', 'tender', 'open', 7)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Shop options (only relevant to shop/stall-based categories)
INSERT INTO category_shop_options (category_id, label, fee_paise, display_order)
SELECT c.id, 'Single Shop', 10000000, 1 FROM categories c WHERE c.slug = 'shops-auction'
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO category_shop_options (category_id, label, fee_paise, display_order)
SELECT c.id, 'Double Shop', 15000000, 2 FROM categories c WHERE c.slug = 'shops-auction'
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- Category-specific field: shop option selector on categories that have one
INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, display_order)
SELECT c.id, 'shop_option_id', 'Shop Selection', 'दुकान चयन', 'select', 1, 1
FROM categories c WHERE c.slug IN ('shops-auction')
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- Category-specific document definitions
INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'aadhaar_card', 'Aadhaar Card', 'आधार कार्ड', 1, 1 FROM categories c
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'registration_certificate', 'Registration Certificate', 'पंजीकरण प्रमाणपत्र', 1, 2
FROM categories c WHERE c.slug IN ('social-organizations', 'refreshment-stalls', 'brand-promotion')
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'artisan_card', 'Artisan Card / Certificate', 'शिल्पकार कार्ड', 1, 2
FROM categories c WHERE c.slug = 'artisan-card-holder'
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'award_certificate', 'National Award Certificate', 'राष्ट्रीय पुरस्कार प्रमाणपत्र', 1, 2
FROM categories c WHERE c.slug = 'national-awardees'
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'representative_id', 'Representative ID', 'प्रतिनिधि पहचान पत्र', 1, 3
FROM categories c WHERE c.slug = 'brand-promotion'
ON DUPLICATE KEY UPDATE label = VALUES(label);
