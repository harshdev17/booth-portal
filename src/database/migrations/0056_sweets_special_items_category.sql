-- Migration 0056: New category "Sweets & Special Items" (मिष्ठान एवं विशेष वस्तुएं)
-- Draw-based category following the same pattern as artisan-card-holders /
-- wooden-craft-carpets / special-art-craft: ₹236 registration fee
-- (₹200 + 18% GST) + ₹50,000 booth/stall allotment amount after draw.
SET @event_id = (SELECT id FROM events WHERE slug = 'gita-mahotsav-2026' LIMIT 1);

INSERT INTO categories (
  event_id, slug, name, name_hi, description, description_hi,
  selection_method, fee_base_paise, gst_percent, fee_paise,
  allotment_amount_paise, status, display_order
)
VALUES (
  @event_id, 'sweets-special-items', 'Sweets & Special Items', 'मिष्ठान एवं विशेष वस्तुएं',
  'Booths/Stalls are reserved for verified sellers of sweets and special items. After checking the application and documents, booth/stall will be given directly if the number of eligible applicants is within the available booth/stall limit. If there are more eligible applicants than available booth/stall, the booth/stall will be allotted through a Draw. Please read the guidelines carefully before applying.',
  'मिष्ठान एवं विशेष वस्तुओं के सत्यापित विक्रेताओं के लिए बूथ/स्टॉल आरक्षित हैं। आवेदन और दस्तावेज़ों की जाँच के बाद, यदि पात्र पाए गए आवेदकों की संख्या उपलब्ध बूथ/स्टॉल की सीमा के भीतर रहती है, तो सीधे आबंटन किया जाएगा। यदि पात्र आवेदकों की संख्या उपलब्ध बूथ/स्टॉल से अधिक होती है, तो ड्रॉ के माध्यम से बूथ/स्टॉल आबंटित किए जाएंगे। आवेदन करने से पहले कृपया गाइडलाइन्स ध्यानपूर्वक पढ़ें।',
  'draw', 20000, 18.00, 23600,
  5000000, 'draft', 11
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  name_hi = VALUES(name_hi),
  description = VALUES(description),
  description_hi = VALUES(description_hi),
  selection_method = VALUES(selection_method),
  fee_base_paise = VALUES(fee_base_paise),
  gst_percent = VALUES(gst_percent),
  fee_paise = VALUES(fee_paise),
  allotment_amount_paise = VALUES(allotment_amount_paise),
  display_order = VALUES(display_order);

SET @category_id = (SELECT id FROM categories WHERE slug = 'sweets-special-items' LIMIT 1);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, allowed_mime_types, max_size_bytes, display_order)
VALUES
  (@category_id, 'aadhaar_card', 'Aadhaar Card / ID Proof', 'आधार कार्ड / पहचान प्रमाण', 1, 'application/pdf,image/jpeg,image/png', 2097152, 1),
  (@category_id, 'registration_certificate', 'Business / Firm Registration Certificate / GST Certificate / PAN Card', 'व्यवसाय / फर्म पंजीकरण प्रमाणपत्र / जीएसटी प्रमाणपत्र / पैन कार्ड', 1, 'application/pdf,image/jpeg,image/png', 2097152, 2),
  (@category_id, 'fssai_license', 'FSSAI License', 'एफएसएसएआई लाइसेंस', 1, 'application/pdf,image/jpeg,image/png', 2097152, 3),
  (@category_id, 'product_photos', 'Product Photographs', 'उत्पादों की तस्वीरें', 1, 'application/pdf,image/jpeg,image/png', 2097152, 4)
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, section, section_hi, display_order, status)
VALUES
  (@category_id, 'business_firm_name', 'Business / Firm Name', 'व्यवसाय/फर्म का नाम', 'text', 1, 191, 'Business Details', 'व्यवसाय का विवरण', 1, 'active'),
  (@category_id, 'fssai_license_number', 'FSSAI License Number', 'एफएसएसएआई लाइसेंस संख्या', 'text', 1, 50, 'FSSAI License', 'FSSAI लाइसेंस', 2, 'active'),
  (@category_id, 'fssai_validity_date', 'FSSAI Validity Date', 'एफएसएसएआई वैधता तिथि', 'text', 1, 20, 'FSSAI License', 'FSSAI लाइसेंस', 3, 'active'),
  (@category_id, 'products_description', 'Description of Sweets / Special Items Sold', 'बेचे जाने वाले मिष्ठान/विशेष वस्तुओं का विवरण', 'textarea', 1, 1024, 'Product Details', 'उत्पाद विवरण', 4, 'active')
ON DUPLICATE KEY UPDATE label = VALUES(label);
