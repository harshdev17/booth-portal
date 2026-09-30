-- Migration 0013: Shop allotment amount (distinct from application fee) +
-- authoritative bilingual content for all 10 official categories.
--
-- Per .ai/PAYMENT.md Section 3, the post-selection "shop fee" (paid at
-- allotment time, separate from the ₹236 application fee) was previously
-- [TBC - Business Confirmation Required]. The user has now supplied real
-- amounts for it per category, so this migration adds the columns for it
-- and backfills them alongside a content correction: several categories
-- (NGOs, SHG, etc.) were previously seeded with fee_paise = 0 ("free
-- application"), but the actual business rule is that the APPLICATION FEE
-- (₹236) applies to all of them — it is the FINAL STALL/BOOTH that is free
-- for those categories, which is what allotment_amount_paise = 0 now
-- represents. Government Departments remains the one category with no
-- application fee at all.
--
-- allotment_amount_paise is used when the amount is a single fixed figure
-- (e.g. Artisan Card Holders: ₹30,000). Several categories don't have one
-- fixed figure ("as per location", "as decided by KDB", or Brand
-- Promotion's two size tiers) — for those, allotment_amount_paise stays
-- NULL and allotment_amount_note/_hi carries the descriptive text instead.
-- Never both invented: a category with neither is genuinely unconfigured,
-- not silently defaulted to a number.

SET NAMES utf8mb4;

ALTER TABLE categories
  ADD COLUMN allotment_amount_paise INT UNSIGNED NULL AFTER gst_percent,
  ADD COLUMN allotment_amount_note VARCHAR(191) NULL AFTER allotment_amount_paise,
  ADD COLUMN allotment_amount_note_hi VARCHAR(191) NULL AFTER allotment_amount_note;

UPDATE categories SET
  name = 'Social Organizations (Registered Social Organizations)',
  name_hi = 'सामाजिक संगठन (रजिस्टर्ड सामाजिक संगठन)',
  description = 'Free stalls for verified NGOs and social service organizations. Stall allotment will be as per Kurukshetra Development Board approval and prescribed process.',
  description_hi = 'सत्यापित NGO एवं सामाजिक सेवा संगठनों के लिए निःशुल्क स्टॉल। स्टॉल का आवंटन कुरुक्षेत्र डेवलपमेंट बोर्ड की स्वीकृति एवं निर्धारित प्रक्रिया के अनुसार किया जाएगा।',
  selection_method = 'manual',
  fee_base_paise = 10000, gst_percent = 18.00, fee_paise = 11800,
  allotment_amount_paise = 0, allotment_amount_note = 'Free Stall', allotment_amount_note_hi = 'निःशुल्क स्टॉल'
WHERE slug = 'ngos-social-organizations';

UPDATE categories SET
  name = 'Refreshment & Food Stalls',
  name_hi = 'रिफ्रेशमेंट एवं फूड स्टॉल',
  description = 'Designated stalls for food and beverages around Brahma Sarovar. These stalls will be allotted by KDB through auction.',
  description_hi = 'ब्रह्म सरोवर के आसपास खाद्य एवं पेय पदार्थों के लिए निर्धारित स्टॉल। इन स्टॉल का आवंटन KDB द्वारा नीलामी के माध्यम से किया जाएगा।',
  selection_method = 'auction',
  fee_base_paise = 10000, gst_percent = 18.00, fee_paise = 11800,
  allotment_amount_paise = NULL, allotment_amount_note = 'As per location', allotment_amount_note_hi = 'स्थान के अनुसार'
WHERE slug = 'refreshment-stalls';

UPDATE categories SET
  name = 'Self Help Groups (SHG)',
  name_hi = 'सेल्फ हेल्प ग्रुप (SHG)',
  description = 'Reserved stalls for registered Self Help Groups. If applications exceed the fixed quota, stalls will be allotted through a transparent draw.',
  description_hi = 'पंजीकृत स्वयं सहायता समूहों के लिए आरक्षित स्टॉल। निर्धारित संख्या से अधिक आवेदन प्राप्त होने पर पारदर्शी ड्रॉ के माध्यम से स्टॉल का आवंटन किया जाएगा।',
  selection_method = 'draw',
  fee_base_paise = 10000, gst_percent = 18.00, fee_paise = 11800,
  allotment_amount_paise = 0, allotment_amount_note = 'Free Stall', allotment_amount_note_hi = 'निःशुल्क स्टॉल'
WHERE slug = 'self-help-groups';

UPDATE categories SET
  name = 'Artisan Card Holders',
  name_hi = 'आर्टिजन कार्ड होल्डर्स',
  description = 'Reserved stalls for verified Ministry of Textiles / Government artisan card holders. Stalls will be allotted through a transparent lucky draw.',
  description_hi = 'सत्यापित वस्त्र मंत्रालय/सरकारी कारीगर कार्ड धारकों के लिए आरक्षित स्टॉल। स्टॉल का आवंटन पारदर्शी लकी ड्रॉ के माध्यम से किया जाएगा।',
  selection_method = 'draw',
  fee_base_paise = 10000, gst_percent = 18.00, fee_paise = 11800,
  allotment_amount_paise = 3000000, allotment_amount_note = NULL, allotment_amount_note_hi = NULL
WHERE slug = 'artisan-card-holders';

UPDATE categories SET
  name = 'National Awardees',
  name_hi = 'राष्ट्रीय पुरस्कार विजेता',
  description = 'Special stalls for national and state award-winning artisans. Stalls will be allotted through an official draw and the process prescribed by KDB.',
  description_hi = 'राष्ट्रीय एवं राज्य पुरस्कार प्राप्त शिल्पकारों के लिए विशेष स्टॉल। स्टॉल का आवंटन आधिकारिक ड्रॉ एवं KDB द्वारा निर्धारित प्रक्रिया के अनुसार किया जाएगा।',
  selection_method = 'draw',
  fee_base_paise = 10000, gst_percent = 18.00, fee_paise = 11800,
  allotment_amount_paise = NULL, allotment_amount_note = 'As decided by Kurukshetra Development Board', allotment_amount_note_hi = 'कुरुक्षेत्र डेवलपमेंट बोर्ड द्वारा निर्धारित'
WHERE slug = 'national-awardees';

UPDATE categories SET
  name = 'Special Art & Craft',
  name_hi = 'विशेष कला एवं शिल्प',
  description = 'Special commercial stalls for participants engaged in traditional and distinctive Indian arts and crafts. Allotment will be through a transparent draw.',
  description_hi = 'पारंपरिक एवं विशिष्ट भारतीय कला और शिल्प से जुड़े प्रतिभागियों के लिए विशेष व्यावसायिक स्टॉल। आवंटन पारदर्शी ड्रॉ के माध्यम से किया जाएगा।',
  selection_method = 'draw',
  fee_base_paise = 10000, gst_percent = 18.00, fee_paise = 11800,
  allotment_amount_paise = NULL, allotment_amount_note = 'As decided by Kurukshetra Development Board', allotment_amount_note_hi = 'कुरुक्षेत्र डेवलपमेंट बोर्ड द्वारा निर्धारित'
WHERE slug = 'special-art-craft';

UPDATE categories SET
  name = 'Wooden Craft & Carpets (Large Space)',
  name_hi = 'लकड़ी शिल्प एवं कालीन (बड़े स्थान)',
  description = 'Special large-format commercial spaces will be available for heavy wooden handicrafts, furniture, and handmade carpets.',
  description_hi = 'भारी लकड़ी के हस्तशिल्प, फर्नीचर एवं हाथ से बने कालीनों के लिए विशेष बड़े आकार के व्यावसायिक स्थान उपलब्ध होंगे।',
  selection_method = 'manual',
  fee_base_paise = 10000, gst_percent = 18.00, fee_paise = 11800,
  allotment_amount_paise = NULL, allotment_amount_note = 'As per location and size', allotment_amount_note_hi = 'स्थान एवं आकार के अनुसार'
WHERE slug = 'wooden-craft-carpets';

UPDATE categories SET
  name = 'Government Departments',
  name_hi = 'सरकारी विभाग',
  description = 'Stalls related to information, public relations, and government schemes for state and central government departments. Stalls will be allotted as per the process prescribed by KDB.',
  description_hi = 'राज्य एवं केंद्र सरकार के विभागों के लिए सूचना, जनसंपर्क एवं सरकारी योजनाओं से संबंधित स्टॉल। स्टॉल का आवंटन KDB द्वारा निर्धारित प्रक्रिया के अनुसार किया जाएगा।',
  selection_method = 'manual',
  fee_base_paise = 0, gst_percent = 0.00, fee_paise = 0,
  allotment_amount_paise = NULL, allotment_amount_note = 'As decided by Kurukshetra Development Board', allotment_amount_note_hi = 'कुरुक्षेत्र डेवलपमेंट बोर्ड द्वारा निर्धारित'
WHERE slug = 'govt-departments';

UPDATE categories SET
  name = 'Reserved Categories (Khadi, etc.)',
  name_hi = 'आरक्षित श्रेणियाँ (खादी आदि)',
  description = 'Reserved stalls for Khadi Gramodyog, cooperative societies, and related rural industry organizations. Stalls will be allotted as per the process prescribed by KDB.',
  description_hi = 'खादी ग्रामोद्योग, सहकारी समितियों एवं संबंधित ग्रामीण उद्योग संस्थाओं के लिए आरक्षित स्टॉल। स्टॉल का आवंटन KDB द्वारा निर्धारित प्रक्रिया के अनुसार किया जाएगा।',
  selection_method = 'manual',
  fee_base_paise = 10000, gst_percent = 18.00, fee_paise = 11800,
  allotment_amount_paise = NULL, allotment_amount_note = 'As decided by Kurukshetra Development Board', allotment_amount_note_hi = 'कुरुक्षेत्र डेवलपमेंट बोर्ड द्वारा निर्धारित'
WHERE slug = 'khadi-other-reserved';

UPDATE categories SET
  name = 'Brand Promotion & Corporate',
  name_hi = 'ब्रांड प्रमोशन एवं कॉर्पोरेट',
  description = 'Commercial and promotional stalls will be available at prime locations for promoting your brand, company, or organization. Stalls will be allotted through competitive tender.',
  description_hi = 'अपने ब्रांड, कंपनी या संस्था के प्रचार के लिए प्रमुख स्थानों पर व्यावसायिक एवं प्रमोशनल स्टॉल उपलब्ध होंगे। स्टॉल का आवंटन प्रतिस्पर्धी निविदा के माध्यम से किया जाएगा।',
  selection_method = 'tender',
  fee_base_paise = 10000, gst_percent = 18.00, fee_paise = 11800,
  allotment_amount_paise = NULL,
  allotment_amount_note = 'Small Shop: Rs. 1,00,000 · Large Shop: Rs. 1,50,000',
  allotment_amount_note_hi = 'छोटी दुकान: ₹1,00,000 · बड़ी दुकान: ₹1,50,000'
WHERE slug = 'brand-promotions';
