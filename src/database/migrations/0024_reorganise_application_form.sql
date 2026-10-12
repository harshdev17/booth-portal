-- Migration 0024: reorganised application form.
--
-- 1. category_field_definitions gains `section` / `section_hi` so the category
--    step can show grouped sub-headings instead of one long flat list.
-- 2. Every live category's fields are re-ordered into logical sections
--    (identity/registration -> activity/products -> requirements).
-- 3. Duplicate / overlapping questions are retired (status='inactive', never
--    deleted, so answers already stored on old applications still display):
--    "Father's / Mother's Name" (Artisan, National Awardees — already in the
--    common Personal step), and the second of each overlapping description pair
--    (Refreshment food_products_description, Wooden work_product_description,
--    Govt stall_activities_description, Brand promotion_activity_description).
-- 4. NGO, Government Department and Brand categories get an
--    `organisation_name` field of their own (the generic "Firm / NGO /
--    Organisation name" is no longer asked of everyone). The server derives
--    applications.organisation_name from the category's own name field.

SET NAMES utf8mb4;

ALTER TABLE category_field_definitions
  ADD COLUMN section    VARCHAR(100) NULL AFTER display_order,
  ADD COLUMN section_hi VARCHAR(100) NULL AFTER section;

-- ngos-social-organizations
INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, display_order)
SELECT id, 'organisation_name', 'Name of NGO / Organisation', 'एनजीओ / संस्था का नाम', 'text', 1, 191, 1 FROM categories WHERE slug = 'ngos-social-organizations'
ON DUPLICATE KEY UPDATE field_key = field_key;
UPDATE category_field_definitions SET display_order = 1, section = 'Organisation Details', section_hi = 'संस्था का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'organisation_name';
UPDATE category_field_definitions SET display_order = 2, section = 'Organisation Details', section_hi = 'संस्था का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'ngo_registration_number';
UPDATE category_field_definitions SET display_order = 3, section = 'Organisation Details', section_hi = 'संस्था का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'registration_date';
UPDATE category_field_definitions SET display_order = 4, section = 'Organisation Details', section_hi = 'संस्था का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'organization_type';
UPDATE category_field_definitions SET display_order = 5, section = 'Organisation Details', section_hi = 'संस्था का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'org_email';
UPDATE category_field_definitions SET display_order = 6, section = 'Organisation Details', section_hi = 'संस्था का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'org_mobile';
UPDATE category_field_definitions SET display_order = 7, section = 'Organisation Details', section_hi = 'संस्था का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'representative_designation';
UPDATE category_field_definitions SET display_order = 8, section = 'Work of the Organisation', section_hi = 'संस्था का कार्य'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'social_work_description';
UPDATE category_field_definitions SET display_order = 9, section = 'Work of the Organisation', section_hi = 'संस्था का कार्य'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'area_of_social_work';
UPDATE category_field_definitions SET display_order = 10, section = 'Stall Details', section_hi = 'स्टॉल का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'proposed_stall_activities';
UPDATE category_field_definitions SET display_order = 11, section = 'Stall Details', section_hi = 'स्टॉल का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'commercial_activity';

-- refreshment-stalls
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'food_products_description';
UPDATE category_field_definitions SET display_order = 1, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'applicant_type';
UPDATE category_field_definitions SET display_order = 2, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'business_firm_name';
UPDATE category_field_definitions SET display_order = 3, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'pan_number';
UPDATE category_field_definitions SET display_order = 4, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'gst_number';
UPDATE category_field_definitions SET display_order = 5, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'business_registration_number';
UPDATE category_field_definitions SET display_order = 6, section = 'FSSAI License', section_hi = 'FSSAI लाइसेंस'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'fssai_license_number';
UPDATE category_field_definitions SET display_order = 7, section = 'FSSAI License', section_hi = 'FSSAI लाइसेंस'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'fssai_license_type';
UPDATE category_field_definitions SET display_order = 8, section = 'FSSAI License', section_hi = 'FSSAI लाइसेंस'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'fssai_validity_date';
UPDATE category_field_definitions SET display_order = 9, section = 'Food Business', section_hi = 'खाद्य व्यवसाय'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'food_business_type';
UPDATE category_field_definitions SET display_order = 10, section = 'Food Business', section_hi = 'खाद्य व्यवसाय'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'years_in_food_business';
UPDATE category_field_definitions SET display_order = 11, section = 'Food Business', section_hi = 'खाद्य व्यवसाय'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'food_products';
UPDATE category_field_definitions SET display_order = 12, section = 'Food Business', section_hi = 'खाद्य व्यवसाय'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'brand_name';
UPDATE category_field_definitions SET display_order = 13, section = 'Food Business', section_hi = 'खाद्य व्यवसाय'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'products_prepacked';
UPDATE category_field_definitions SET display_order = 14, section = 'Safety', section_hi = 'सुरक्षा'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'cooking_required';
UPDATE category_field_definitions SET display_order = 15, section = 'Safety', section_hi = 'सुरक्षा'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'lpg_open_flame';

-- self-help-groups
UPDATE category_field_definitions SET display_order = 1, section = 'SHG Details', section_hi = 'स्वयं सहायता समूह का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_name';
UPDATE category_field_definitions SET display_order = 2, section = 'SHG Details', section_hi = 'स्वयं सहायता समूह का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_registration_number';
UPDATE category_field_definitions SET display_order = 3, section = 'SHG Details', section_hi = 'स्वयं सहायता समूह का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'registration_date';
UPDATE category_field_definitions SET display_order = 4, section = 'SHG Details', section_hi = 'स्वयं सहायता समूह का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_location';
UPDATE category_field_definitions SET display_order = 5, section = 'SHG Details', section_hi = 'स्वयं सहायता समूह का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_location_category';
UPDATE category_field_definitions SET display_order = 6, section = 'SHG Details', section_hi = 'स्वयं सहायता समूह का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_member_count';
UPDATE category_field_definitions SET display_order = 7, section = 'Contact', section_hi = 'संपर्क'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_mobile_number';
UPDATE category_field_definitions SET display_order = 8, section = 'Contact', section_hi = 'संपर्क'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_email';
UPDATE category_field_definitions SET display_order = 9, section = 'Contact', section_hi = 'संपर्क'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'representative_designation';
UPDATE category_field_definitions SET display_order = 10, section = 'Products', section_hi = 'उत्पाद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'products_made';
UPDATE category_field_definitions SET display_order = 11, section = 'Products', section_hi = 'उत्पाद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'product_description';
UPDATE category_field_definitions SET display_order = 12, section = 'Products', section_hi = 'उत्पाद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'manufacturing_process';

-- artisan-card-holders
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'father_mother_name';
UPDATE category_field_definitions SET display_order = 1, section = 'Artisan Card', section_hi = 'कारीगर कार्ड'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'artisan_card_number';
UPDATE category_field_definitions SET display_order = 2, section = 'Artisan Card', section_hi = 'कारीगर कार्ड'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'artisan_card_issuing_dept';
UPDATE category_field_definitions SET display_order = 3, section = 'Artisan Card', section_hi = 'कारीगर कार्ड'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'artisan_card_validity';
UPDATE category_field_definitions SET display_order = 4, section = 'Artisan Work', section_hi = 'कारीगरी का कार्य'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'artisan_work_type';
UPDATE category_field_definitions SET display_order = 5, section = 'Artisan Work', section_hi = 'कारीगरी का कार्य'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'years_of_experience';
UPDATE category_field_definitions SET display_order = 6, section = 'Artisan Work', section_hi = 'कारीगरी का कार्य'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'artisan_work_description';
UPDATE category_field_definitions SET display_order = 7, section = 'Artisan Work', section_hi = 'कारीगरी का कार्य'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'products_made';
UPDATE category_field_definitions SET display_order = 8, section = 'Artisan Work', section_hi = 'कारीगरी का कार्य'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'materials_used';
UPDATE category_field_definitions SET display_order = 9, section = 'Additional (Optional)', section_hi = 'अतिरिक्त (वैकल्पिक)'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'traditional_local_art_details';
UPDATE category_field_definitions SET display_order = 10, section = 'Additional (Optional)', section_hi = 'अतिरिक्त (वैकल्पिक)'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'speciality_of_work';

-- national-awardees
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'national-awardees') AND field_key = 'father_mother_name';
UPDATE category_field_definitions SET display_order = 1, section = 'Award Details', section_hi = 'पुरस्कार का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'national-awardees') AND field_key = 'award_name';
UPDATE category_field_definitions SET display_order = 2, section = 'Award Details', section_hi = 'पुरस्कार का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'national-awardees') AND field_key = 'award_category';
UPDATE category_field_definitions SET display_order = 3, section = 'Award Details', section_hi = 'पुरस्कार का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'national-awardees') AND field_key = 'award_year';
UPDATE category_field_definitions SET display_order = 4, section = 'Award Details', section_hi = 'पुरस्कार का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'national-awardees') AND field_key = 'awarding_authority';
UPDATE category_field_definitions SET display_order = 5, section = 'Award Details', section_hi = 'पुरस्कार का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'national-awardees') AND field_key = 'award_certificate_number';
UPDATE category_field_definitions SET display_order = 6, section = 'Award Details', section_hi = 'पुरस्कार का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'national-awardees') AND field_key = 'award_description';
UPDATE category_field_definitions SET display_order = 7, section = 'Work Details', section_hi = 'कार्य का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'national-awardees') AND field_key = 'art_craft_type';
UPDATE category_field_definitions SET display_order = 8, section = 'Work Details', section_hi = 'कार्य का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'national-awardees') AND field_key = 'experience';
UPDATE category_field_definitions SET display_order = 9, section = 'Work Details', section_hi = 'कार्य का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'national-awardees') AND field_key = 'work_description';
UPDATE category_field_definitions SET display_order = 10, section = 'Work Details', section_hi = 'कार्य का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'national-awardees') AND field_key = 'product_description';

-- special-art-craft
UPDATE category_field_definitions SET display_order = 1, section = 'Craft Details', section_hi = 'शिल्प का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'art_craft_name';
UPDATE category_field_definitions SET display_order = 2, section = 'Craft Details', section_hi = 'शिल्प का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'art_craft_type';
UPDATE category_field_definitions SET display_order = 3, section = 'Craft Details', section_hi = 'शिल्प का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'traditional_local_art_details';
UPDATE category_field_definitions SET display_order = 4, section = 'Craft Details', section_hi = 'शिल्प का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'craft_uniqueness';
UPDATE category_field_definitions SET display_order = 5, section = 'Products', section_hi = 'उत्पाद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'products_to_display';
UPDATE category_field_definitions SET display_order = 6, section = 'Products', section_hi = 'उत्पाद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'materials_used';
UPDATE category_field_definitions SET display_order = 7, section = 'Products', section_hi = 'उत्पाद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'craft_process';
UPDATE category_field_definitions SET display_order = 8, section = 'Products', section_hi = 'उत्पाद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'years_of_experience';
UPDATE category_field_definitions SET display_order = 9, section = 'Registration (Optional)', section_hi = 'पंजीकरण (वैकल्पिक)'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'craft_business_registration_number';
UPDATE category_field_definitions SET display_order = 10, section = 'Registration (Optional)', section_hi = 'पंजीकरण (वैकल्पिक)'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'artisan_craft_certificate_number';

-- wooden-craft-carpets
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'work_product_description';
UPDATE category_field_definitions SET display_order = 1, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'business_firm_name';
UPDATE category_field_definitions SET display_order = 2, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'business_registration_number';
UPDATE category_field_definitions SET display_order = 3, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'gst_number';
UPDATE category_field_definitions SET display_order = 4, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'pan_number';
UPDATE category_field_definitions SET display_order = 5, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'years_in_business';
UPDATE category_field_definitions SET display_order = 6, section = 'Products', section_hi = 'उत्पाद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'product_category';
UPDATE category_field_definitions SET display_order = 7, section = 'Products', section_hi = 'उत्पाद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'product_description';
UPDATE category_field_definitions SET display_order = 8, section = 'Products', section_hi = 'उत्पाद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'products_count';
UPDATE category_field_definitions SET display_order = 9, section = 'Products', section_hi = 'उत्पाद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'largest_product_size';
UPDATE category_field_definitions SET display_order = 10, section = 'Space Required', section_hi = 'आवश्यक स्थान'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'large_space_reason';
UPDATE category_field_definitions SET display_order = 11, section = 'Space Required', section_hi = 'आवश्यक स्थान'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'approximate_space_required';
UPDATE category_field_definitions SET display_order = 12, section = 'Space Required', section_hi = 'आवश्यक स्थान'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'stall_length';
UPDATE category_field_definitions SET display_order = 13, section = 'Space Required', section_hi = 'आवश्यक स्थान'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'stall_width';
UPDATE category_field_definitions SET display_order = 14, section = 'Space Required', section_hi = 'आवश्यक स्थान'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'large_products_count';
UPDATE category_field_definitions SET display_order = 15, section = 'Facilities', section_hi = 'सुविधाएँ'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'special_display_requirements';
UPDATE category_field_definitions SET display_order = 16, section = 'Facilities', section_hi = 'सुविधाएँ'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'electricity_requirement';
UPDATE category_field_definitions SET display_order = 17, section = 'Facilities', section_hi = 'सुविधाएँ'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'other_space_requirements';

-- govt-departments
INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, display_order)
SELECT id, 'organisation_name', 'Department Name', 'विभाग का नाम', 'text', 1, 191, 1 FROM categories WHERE slug = 'govt-departments'
ON DUPLICATE KEY UPDATE field_key = field_key;
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'stall_activities_description';
UPDATE category_field_definitions SET display_order = 1, section = 'Department Details', section_hi = 'विभाग का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'organisation_name';
UPDATE category_field_definitions SET display_order = 2, section = 'Department Details', section_hi = 'विभाग का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'department_type';
UPDATE category_field_definitions SET display_order = 3, section = 'Department Details', section_hi = 'विभाग का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'officer_designation';
UPDATE category_field_definitions SET display_order = 4, section = 'Department Details', section_hi = 'विभाग का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'government_id_number';
UPDATE category_field_definitions SET display_order = 5, section = 'Department Details', section_hi = 'विभाग का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'official_email';
UPDATE category_field_definitions SET display_order = 6, section = 'Department Details', section_hi = 'विभाग का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'official_contact_number';
UPDATE category_field_definitions SET display_order = 7, section = 'Stall Activities', section_hi = 'स्टॉल की गतिविधियाँ'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'schemes_to_display';
UPDATE category_field_definitions SET display_order = 8, section = 'Stall Activities', section_hi = 'स्टॉल की गतिविधियाँ'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'citizen_services';
UPDATE category_field_definitions SET display_order = 9, section = 'Stall Activities', section_hi = 'स्टॉल की गतिविधियाँ'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'public_awareness_activities';
UPDATE category_field_definitions SET display_order = 10, section = 'Requirements', section_hi = 'आवश्यकताएँ'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'expected_requirements';
UPDATE category_field_definitions SET display_order = 11, section = 'Requirements', section_hi = 'आवश्यकताएँ'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'commercial_promotion';

-- brand-promotions
INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, display_order)
SELECT id, 'organisation_name', 'Company / Firm Name', 'कंपनी / फर्म का नाम', 'text', 1, 191, 1 FROM categories WHERE slug = 'brand-promotions'
ON DUPLICATE KEY UPDATE field_key = field_key;
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'promotion_activity_description';
UPDATE category_field_definitions SET display_order = 1, section = 'Company Details', section_hi = 'कंपनी का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'organisation_name';
UPDATE category_field_definitions SET display_order = 2, section = 'Company Details', section_hi = 'कंपनी का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'business_type';
UPDATE category_field_definitions SET display_order = 3, section = 'Company Details', section_hi = 'कंपनी का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'registration_number';
UPDATE category_field_definitions SET display_order = 4, section = 'Company Details', section_hi = 'कंपनी का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'gst_number';
UPDATE category_field_definitions SET display_order = 5, section = 'Company Details', section_hi = 'कंपनी का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'pan_number';
UPDATE category_field_definitions SET display_order = 6, section = 'Company Details', section_hi = 'कंपनी का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'website';
UPDATE category_field_definitions SET display_order = 7, section = 'Contact', section_hi = 'संपर्क'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'business_email';
UPDATE category_field_definitions SET display_order = 8, section = 'Contact', section_hi = 'संपर्क'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'business_mobile_number';
UPDATE category_field_definitions SET display_order = 9, section = 'Contact', section_hi = 'संपर्क'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'representative_designation';
UPDATE category_field_definitions SET display_order = 10, section = 'Brand', section_hi = 'ब्रांड'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'brand_name';
UPDATE category_field_definitions SET display_order = 11, section = 'Brand', section_hi = 'ब्रांड'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'product_service_name';
UPDATE category_field_definitions SET display_order = 12, section = 'Brand', section_hi = 'ब्रांड'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'product_service_category';
UPDATE category_field_definitions SET display_order = 13, section = 'Brand', section_hi = 'ब्रांड'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'brand_description';
UPDATE category_field_definitions SET display_order = 14, section = 'Promotion', section_hi = 'प्रचार'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'promotion_purpose';
UPDATE category_field_definitions SET display_order = 15, section = 'Promotion', section_hi = 'प्रचार'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'proposed_promotional_activities';
UPDATE category_field_definitions SET display_order = 16, section = 'Requirements', section_hi = 'आवश्यकताएँ'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'display_requirements';
UPDATE category_field_definitions SET display_order = 17, section = 'Requirements', section_hi = 'आवश्यकताएँ'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'electricity_requirement';
UPDATE category_field_definitions SET display_order = 18, section = 'Requirements', section_hi = 'आवश्यकताएँ'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'approximate_staff';
UPDATE category_field_definitions SET display_order = 19, section = 'Requirements', section_hi = 'आवश्यकताएँ'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'additional_requirements';

