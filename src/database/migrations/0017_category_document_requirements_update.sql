-- Migration 0017: Update required documents per category, per business-supplied
-- "Required Documents – Category Wise" list.
--
-- Existing document_definition rows already have uploaded applicant files
-- against them (application_documents.document_definition_id has an
-- ON DELETE RESTRICT FK — see 0003_categories_and_applications.sql), so this
-- migration never deletes a row. Where the new list's wording maps onto an
-- existing document_key, the label is updated in place; everything else is
-- added as a new document_key via INSERT ... ON DUPLICATE KEY UPDATE.

-- 1. NGOs & Social Organizations
UPDATE category_document_definitions d
JOIN categories c ON c.id = d.category_id
SET d.label = 'Applicant/Authorized Representative Aadhaar Card',
    d.label_hi = 'आवेदक/अधिकृत प्रतिनिधि आधार कार्ड'
WHERE c.slug = 'ngos-social-organizations' AND d.document_key = 'aadhaar_card';

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'ngo_registration_certificate', 'Valid NGO Registration Certificate', 'वैध एनजीओ पंजीकरण प्रमाणपत्र', 1, 2
FROM categories c WHERE c.slug = 'ngos-social-organizations'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'authorization_letter', 'Authorization Letter', 'प्राधिकार पत्र', 1, 3
FROM categories c WHERE c.slug = 'ngos-social-organizations'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

-- 2. Government Departments
UPDATE category_document_definitions d
JOIN categories c ON c.id = d.category_id
SET d.label = 'Authorized Officer/Representative Valid Government ID',
    d.label_hi = 'अधिकृत अधिकारी/प्रतिनिधि वैध सरकारी पहचान पत्र'
WHERE c.slug = 'govt-departments' AND d.document_key = 'aadhaar_card';

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'department_authorization_letter', 'Department Authorization Letter', 'विभागीय प्राधिकार पत्र', 1, 2
FROM categories c WHERE c.slug = 'govt-departments'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

-- 3. Artisan Card Holders
INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'artisan_card', 'Valid Artisan Card / Artisan Registration Card / Artisan Certificate', 'वैध शिल्पकार कार्ड / शिल्पकार पंजीकरण कार्ड / शिल्पकार प्रमाणपत्र', 1, 2
FROM categories c WHERE c.slug = 'artisan-card-holders'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'passport_photo', 'Passport Size Photograph', 'पासपोर्ट साइज़ फोटो', 1, 3
FROM categories c WHERE c.slug = 'artisan-card-holders'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'work_product_photos', 'Work/Product Photographs', 'कार्य/उत्पाद की फोटो', 1, 4
FROM categories c WHERE c.slug = 'artisan-card-holders'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

-- 4. National Awardees (award_certificate already exists)
INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'passport_photo', 'Passport Size Photograph', 'पासपोर्ट साइज़ फोटो', 1, 3
FROM categories c WHERE c.slug = 'national-awardees'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'work_product_photos', 'Work/Product Photographs', 'कार्य/उत्पाद की फोटो', 1, 4
FROM categories c WHERE c.slug = 'national-awardees'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

-- 5. Refreshment Food Stalls (registration_certificate already exists, relabel it)
UPDATE category_document_definitions d
JOIN categories c ON c.id = d.category_id
SET d.label = 'Business / Firm Registration Certificate / GST Certificate / PAN Card',
    d.label_hi = 'व्यवसाय / फर्म पंजीकरण प्रमाणपत्र / जीएसटी प्रमाणपत्र / पैन कार्ड'
WHERE c.slug = 'refreshment-stalls' AND d.document_key = 'registration_certificate';

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'fssai_license', 'FSSAI License', 'एफएसएसएआई लाइसेंस', 1, 3
FROM categories c WHERE c.slug = 'refreshment-stalls'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

-- 6. Brand Promotion
UPDATE category_document_definitions d
JOIN categories c ON c.id = d.category_id
SET d.label = 'Owner/Authorized Representative Aadhaar Card',
    d.label_hi = 'मालिक/अधिकृत प्रतिनिधि आधार कार्ड'
WHERE c.slug = 'brand-promotions' AND d.document_key = 'aadhaar_card';

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'firm_registration_certificate', 'Firm/Company/Business Registration Certificate', 'फर्म/कंपनी/व्यवसाय पंजीकरण प्रमाणपत्र', 1, 2
FROM categories c WHERE c.slug = 'brand-promotions'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'authorization_letter', 'Authorization Letter', 'प्राधिकार पत्र', 1, 3
FROM categories c WHERE c.slug = 'brand-promotions'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

-- 7. Self Help Group (SHG)
UPDATE category_document_definitions d
JOIN categories c ON c.id = d.category_id
SET d.label = 'Authorized Representative Aadhaar Card',
    d.label_hi = 'अधिकृत प्रतिनिधि आधार कार्ड'
WHERE c.slug = 'self-help-groups' AND d.document_key = 'aadhaar_card';

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'shg_registration_certificate', 'SHG Registration Certificate / Registration Proof', 'एसएचजी पंजीकरण प्रमाणपत्र / पंजीकरण प्रमाण', 1, 2
FROM categories c WHERE c.slug = 'self-help-groups'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'authorization_letter', 'Authorization Letter', 'प्राधिकार पत्र', 1, 3
FROM categories c WHERE c.slug = 'self-help-groups'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'product_photos', 'Product Photographs', 'उत्पाद की फोटो', 1, 4
FROM categories c WHERE c.slug = 'self-help-groups'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

-- 8. Special Art & Craft
INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'passport_photo', 'Passport Size Photograph', 'पासपोर्ट साइज़ फोटो', 1, 2
FROM categories c WHERE c.slug = 'special-art-craft'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'work_product_photos', 'Work/Product Photographs', 'कार्य/उत्पाद की फोटो', 1, 3
FROM categories c WHERE c.slug = 'special-art-craft'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

-- 9. Wooden Craft & Carpets – Large Space
INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'firm_business_registration_certificate', 'Firm/Business Registration Certificate / GST Certificate / PAN Card', 'फर्म/व्यवसाय पंजीकरण प्रमाणपत्र / जीएसटी प्रमाणपत्र / पैन कार्ड', 1, 2
FROM categories c WHERE c.slug = 'wooden-craft-carpets'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
SELECT c.id, 'product_work_photos', 'Product/Work Photographs', 'उत्पाद/कार्य की फोटो', 1, 3
FROM categories c WHERE c.slug = 'wooden-craft-carpets'
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);
