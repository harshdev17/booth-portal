-- Migration 0007: Update categories to official 10 KDB categories for International Gita Mahotsav 2026
--
-- Categories provided by user:
-- 1. NGOs / Social Organizations (Free, decided by KDB) -> manual
-- 2. Refreshment Stalls (Auctioned manually by KDB) -> auction
-- 3. Self Help Groups (SHG - Excess from reserved seats via draw) -> draw
-- 4. Artisan Card Holders (Method - draw) -> draw
-- 5. National Awardees (Method - draw) -> draw
-- 6. Special Art and Craft (Method - draw) -> draw
-- 7. Wooden Craft and Carpets (Big space, Method - draw) -> draw
-- 8. Government Departments (Decided by KDB Manually) -> manual
-- 9. Reserved for Other Categories (Khadi etc.) -> application_fee
-- 10. Brand Promotions -> tender

SET @event_id = (SELECT id FROM events WHERE slug = 'gita-mahotsav-2026' LIMIT 1);

-- Upsert all 10 official categories
INSERT INTO categories (event_id, slug, name, name_hi, description, description_hi, selection_method, fee_base_paise, gst_percent, fee_paise, status, display_order)
VALUES
  (@event_id, 'ngos-social-organizations', 'NGOs & Social Organizations', 'गैर-सरकारी संगठन / सामाजिक संस्थाएं',
   'Free of cost stalls for verified NGOs and social service organizations, subject to KDB committee approval.',
   'सत्यापित गैर-सरकारी संगठनों और सामाजिक संस्थाओं हेतु निःशुल्क स्टॉल, कुरुक्षेत्र विकास बोर्ड द्वारा अनुमोदित।',
   'manual', 0, 0, 0, 'open', 1),

  (@event_id, 'refreshment-stalls', 'Refreshment & Food Stalls', 'जलपान एवं खान-पान स्टॉल',
   'Designated food and beverage spaces around Brahma Sarovar, auctioned through manual bidding by KDB.',
   'ब्रह्मसरोवर मेला क्षेत्र में खान-पान एवं जलपान हेतु व्यावसायिक स्थल, केडीबी द्वारा नीलामी अनुसार।',
   'auction', 10000, 18.00, 11800, 'open', 2),

  (@event_id, 'self-help-groups', 'Self Help Groups (SHG)', 'स्वयं सहायता समूह (SHG)',
   'Dedicated stalls for registered Self Help Groups. Applications in excess of reserved quota are allocated via transparent draw.',
   'पंजीकृत स्वयं सहायता समूहों हेतु आरक्षित स्टॉल। निर्धारित कोटे से अधिक आवेदन होने पर पारदर्शी ड्रॉ द्वारा आवंटन।',
   'draw', 10000, 18.00, 11800, 'open', 3),

  (@event_id, 'artisan-card-holders', 'Artisan Card Holders', 'शिल्पकार कार्ड धारक',
   'Reserved stalls for verified Ministry of Textiles/Govt. artisan card holders, allotted through transparent lucky draw.',
   'मान्यता प्राप्त हस्तशिल्प/शिल्पकार कार्ड धारकों हेतु आरक्षित स्टॉल, पारदर्शी लकी ड्रॉ द्वारा आवंटित।',
   'draw', 10000, 18.00, 11800, 'open', 4),

  (@event_id, 'national-awardees', 'National Awardees', 'राष्ट्रीय पुरस्कार विजेता',
   'Distinguished stalls for national and state awardee master craftsmen, allotted through official draw.',
   'राष्ट्रीय एवं राज्य पुरस्कार विजेता मास्टर शिल्पकारों हेतु विशेष स्टॉल, आधिकारिक ड्रॉ द्वारा आवंटित।',
   'draw', 10000, 18.00, 11800, 'open', 5),

  (@event_id, 'special-art-craft', 'Special Art & Craft', 'विशेष कला एवं शिल्प श्रेणी',
   'Curated commercial spaces for traditional and unique Indian art forms, allotted via transparent draw.',
   'पारंपरिक एवं दुर्लभ भारतीय कला व शिल्प के प्रदर्शन एवं विक्रय हेतु विशेष स्टॉल, ड्रॉ द्वारा आवंटित।',
   'draw', 10000, 18.00, 11800, 'open', 6),

  (@event_id, 'wooden-craft-carpets', 'Wooden Craft & Carpets (Large Space)', 'काष्ठ शिल्प एवं कालीन (विस्तृत स्थान)',
   'Specialized large-format commercial spaces required for heavy wooden handicrafts, furniture, and handloom carpets.',
   'बड़े आकार के स्टॉल जो भारी काष्ठ शिल्प, फर्नीचर एवं हाथ से बुने कालीनों के प्रदर्शन हेतु आवश्यक हैं।',
   'draw', 10000, 18.00, 11800, 'open', 7),

  (@event_id, 'govt-departments', 'Government Departments', 'सरकारी विभाग एवं उपक्रम',
   'Informational and public outreach stalls for state and central government departments, decided manually by KDB.',
   'राज्य एवं केंद्र सरकार के विभागों, निगमों व सार्वजनिक उपक्रमों के सूचनात्मक स्टॉल, केडीबी द्वारा निर्धारित।',
   'manual', 0, 0, 0, 'open', 8),

  (@event_id, 'khadi-other-reserved', 'Reserved Categories (Khadi, etc.)', 'आरक्षित श्रेणियां (खादी एवं अन्य)',
   'Stalls reserved for Khadi Gramodyog, co-operatives, and allied designated rural industry bodies on application fee basis.',
   'खादी ग्रामोद्योग, सहकारी समितियों एवं संबंधित ग्रामीण उद्योग संस्थाओं हेतु निर्धारित आवेदन शुल्क पर स्टॉल।',
   'application_fee', 10000, 18.00, 11800, 'open', 9),

  (@event_id, 'brand-promotions', 'Brand Promotions & Corporate', 'ब्रांड प्रमोशन एवं कॉर्पोरेट प्रदर्शनी',
   'High-visibility commercial sponsorship and promotional booth spaces allocated via competitive tender.',
   'मेला क्षेत्र में ब्रांड प्रचार, कॉर्पोरेट प्रमोशन एवं प्रचार गतिविधियों हेतु निविदा (टेंडर) आधारित आवंटन।',
   'tender', 10000, 18.00, 11800, 'open', 10)

ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  name_hi = VALUES(name_hi),
  description = VALUES(description),
  description_hi = VALUES(description_hi),
  selection_method = VALUES(selection_method),
  fee_base_paise = VALUES(fee_base_paise),
  gst_percent = VALUES(gst_percent),
  fee_paise = VALUES(fee_paise),
  status = VALUES(status),
  display_order = VALUES(display_order);

-- Archive or deactivate any old provisional slugs not in the new 10
UPDATE categories
SET status = 'archived'
WHERE event_id = @event_id
  AND slug NOT IN (
    'ngos-social-organizations',
    'refreshment-stalls',
    'self-help-groups',
    'artisan-card-holders',
    'national-awardees',
    'special-art-craft',
    'wooden-craft-carpets',
    'govt-departments',
    'khadi-other-reserved',
    'brand-promotions'
  );

-- Ensure document definitions are present for the categories
INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'aadhaar_card', 'Aadhaar Card / ID Proof', 'आधार कार्ड / पहचान प्रमाण', 1, 1
FROM categories c
WHERE c.slug IN (
  'ngos-social-organizations',
  'refreshment-stalls',
  'self-help-groups',
  'artisan-card-holders',
  'national-awardees',
  'special-art-craft',
  'wooden-craft-carpets',
  'govt-departments',
  'khadi-other-reserved',
  'brand-promotions'
)
ON DUPLICATE KEY UPDATE label = VALUES(label);
