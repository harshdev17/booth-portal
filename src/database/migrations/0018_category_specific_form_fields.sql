-- Migration 0018: Category-specific application form fields, per the
-- business-supplied "Application Form" spec for all 9 categories.
--
-- The common fields (name, Aadhaar, mobile, address, etc.), documents, and
-- declaration checkboxes are already generic/dynamic (schema.ts,
-- category_document_definitions). This migration ONLY adds the
-- CATEGORY-SPECIFIC extra fields from "Section 2/3" of each category's form
-- into category_field_definitions, which CategoryFieldsStep.tsx already
-- renders automatically — no frontend code change needed for these.
--
-- Multi-select checkbox groups in the source spec (e.g. "Areas of Social
-- Work", "Expected Requirements") are seeded as single-select dropdowns
-- ('select') since category_field_definitions/CategoryFieldsStep only
-- support single-value select/radio/text/textarea today — true multi-select
-- checkboxes would need a new input_type and frontend support, which is a
-- separate feature, not a field-seeding change. [Flagged to business —
-- see .ai/OPEN_QUESTIONS.md.]
--
-- categoryFieldValueSchema (schema.ts) caps each category at 25 fields and
-- each field_key at 64 chars / value at 1024 chars — all rows below respect
-- that ceiling per category.

-- 1. NGO / Social Organizations
SET @cat_ngo = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations' LIMIT 1);

INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, options_json, display_order)
VALUES
  (@cat_ngo, 'ngo_registration_number', 'NGO Registration Number', 'एनजीओ पंजीकरण संख्या', 'text', 1, 100, NULL, 1),
  (@cat_ngo, 'registration_date', 'Registration Date', 'पंजीकरण तिथि', 'text', 1, 20, NULL, 2),
  (@cat_ngo, 'organization_type', 'Type of Organization', 'संस्था का प्रकार', 'select', 1, 50,
    JSON_ARRAY(JSON_OBJECT('value','ngo','label','NGO'), JSON_OBJECT('value','society','label','Society'), JSON_OBJECT('value','trust','label','Trust'), JSON_OBJECT('value','other','label','Other')), 3),
  (@cat_ngo, 'org_email', 'Organization Email', 'संस्था ईमेल', 'text', 1, 191, NULL, 4),
  (@cat_ngo, 'org_mobile', 'Organization Mobile Number', 'संस्था मोबाइल नंबर', 'text', 1, 15, NULL, 5),
  (@cat_ngo, 'representative_designation', 'Designation', 'पदनाम', 'text', 1, 100, NULL, 6),
  (@cat_ngo, 'social_work_description', 'Briefly describe your organization''s work', 'संस्था के कार्य का संक्षिप्त विवरण', 'textarea', 1, 1024, NULL, 7),
  (@cat_ngo, 'area_of_social_work', 'Areas of Social Work', 'सामाजिक कार्य के क्षेत्र', 'select', 1, 50,
    JSON_ARRAY(JSON_OBJECT('value','education','label','Education'), JSON_OBJECT('value','health','label','Health'), JSON_OBJECT('value','environment','label','Environment'), JSON_OBJECT('value','women_empowerment','label','Women Empowerment'), JSON_OBJECT('value','child_welfare','label','Child Welfare'), JSON_OBJECT('value','skill_development','label','Skill Development'), JSON_OBJECT('value','social_awareness','label','Social Awareness'), JSON_OBJECT('value','other','label','Other')), 8),
  (@cat_ngo, 'proposed_stall_activities', 'Activities proposed at the Mahotsav Stall', 'महोत्सव स्टॉल पर प्रस्तावित गतिविधियां', 'textarea', 1, 1024, NULL, 9),
  (@cat_ngo, 'commercial_activity', 'Will you conduct any commercial activity at the stall?', 'क्या स्टॉल पर कोई व्यावसायिक गतिविधि होगी?', 'select', 1, 10,
    JSON_ARRAY(JSON_OBJECT('value','no','label','No'), JSON_OBJECT('value','yes','label','Yes')), 10)
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi);

-- 2. Government Department
SET @cat_govt = (SELECT id FROM categories WHERE slug = 'govt-departments' LIMIT 1);

INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, options_json, display_order)
VALUES
  (@cat_govt, 'department_type', 'Government / Department Type', 'सरकार/विभाग का प्रकार', 'select', 1, 50,
    JSON_ARRAY(JSON_OBJECT('value','central_government','label','Central Government'), JSON_OBJECT('value','haryana_government','label','Haryana Government'), JSON_OBJECT('value','government_institution','label','Government Institution'), JSON_OBJECT('value','other','label','Other')), 1),
  (@cat_govt, 'official_email', 'Official Email', 'आधिकारिक ईमेल', 'text', 1, 191, NULL, 2),
  (@cat_govt, 'official_contact_number', 'Official Contact Number', 'आधिकारिक संपर्क नंबर', 'text', 1, 15, NULL, 3),
  (@cat_govt, 'officer_designation', 'Officer Designation', 'अधिकारी पदनाम', 'text', 1, 100, NULL, 4),
  (@cat_govt, 'government_id_number', 'Government ID Number', 'सरकारी पहचान पत्र संख्या', 'text', 1, 100, NULL, 5),
  (@cat_govt, 'schemes_to_display', 'Government Schemes to be Displayed', 'प्रदर्शित की जाने वाली सरकारी योजनाएं', 'textarea', 1, 1024, NULL, 6),
  (@cat_govt, 'citizen_services', 'Citizen Services to be Promoted', 'प्रचारित की जाने वाली नागरिक सेवाएं', 'textarea', 1, 1024, NULL, 7),
  (@cat_govt, 'public_awareness_activities', 'Public Awareness Activities', 'जन जागरूकता गतिविधियां', 'textarea', 0, 1024, NULL, 8),
  (@cat_govt, 'stall_activities_description', 'Brief Description of Stall Activities', 'स्टॉल गतिविधियों का संक्षिप्त विवरण', 'textarea', 1, 1024, NULL, 9),
  (@cat_govt, 'expected_requirements', 'Expected Requirements', 'अपेक्षित आवश्यकताएं', 'select', 0, 50,
    JSON_ARRAY(JSON_OBJECT('value','display_area','label','Display Area'), JSON_OBJECT('value','information_desk','label','Information Desk'), JSON_OBJECT('value','public_interaction','label','Public Interaction'), JSON_OBJECT('value','other','label','Other')), 10),
  (@cat_govt, 'commercial_promotion', 'Will the stall be used for commercial / brand promotion?', 'क्या स्टॉल का उपयोग व्यावसायिक/ब्रांड प्रचार हेतु होगा?', 'select', 1, 10,
    JSON_ARRAY(JSON_OBJECT('value','no','label','No'), JSON_OBJECT('value','yes','label','Yes')), 11)
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi);

-- 3. Refreshment Food Stall
SET @cat_food = (SELECT id FROM categories WHERE slug = 'refreshment-stalls' LIMIT 1);

INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, options_json, display_order)
VALUES
  (@cat_food, 'applicant_type', 'Applicant Type', 'आवेदक का प्रकार', 'select', 1, 50,
    JSON_ARRAY(JSON_OBJECT('value','individual','label','Individual'), JSON_OBJECT('value','proprietorship','label','Proprietorship'), JSON_OBJECT('value','partnership','label','Partnership'), JSON_OBJECT('value','company','label','Company'), JSON_OBJECT('value','firm','label','Firm'), JSON_OBJECT('value','other','label','Other')), 1),
  (@cat_food, 'business_firm_name', 'Business / Firm Name', 'व्यवसाय/फर्म का नाम', 'text', 1, 191, NULL, 2),
  (@cat_food, 'pan_number', 'PAN Number', 'पैन नंबर', 'text', 1, 20, NULL, 3),
  (@cat_food, 'gst_number', 'GST Number, if applicable', 'जीएसटी नंबर (यदि लागू हो)', 'text', 0, 20, NULL, 4),
  (@cat_food, 'business_registration_number', 'Business / Firm Registration Number', 'व्यवसाय/फर्म पंजीकरण संख्या', 'text', 0, 100, NULL, 5),
  (@cat_food, 'food_business_type', 'Type of Food Business', 'खाद्य व्यवसाय का प्रकार', 'text', 1, 191, NULL, 6),
  (@cat_food, 'years_in_food_business', 'Years in Food Business', 'खाद्य व्यवसाय में अनुभव (वर्ष)', 'text', 1, 10, NULL, 7),
  (@cat_food, 'food_products', 'Food Products to be Sold', 'बेचे जाने वाले खाद्य उत्पाद', 'textarea', 1, 1024, NULL, 8),
  (@cat_food, 'brand_name', 'Brand Name, if applicable', 'ब्रांड नाम (यदि लागू हो)', 'text', 0, 191, NULL, 9),
  (@cat_food, 'food_products_description', 'Brief Description of Food Products', 'खाद्य उत्पादों का संक्षिप्त विवरण', 'textarea', 1, 1024, NULL, 10),
  (@cat_food, 'fssai_license_number', 'FSSAI License Number', 'एफएसएसएआई लाइसेंस संख्या', 'text', 1, 50, NULL, 11),
  (@cat_food, 'fssai_license_type', 'FSSAI License Type', 'एफएसएसएआई लाइसेंस प्रकार', 'text', 1, 50, NULL, 12),
  (@cat_food, 'fssai_validity_date', 'FSSAI Validity Date', 'एफएसएसएआई वैधता तिथि', 'text', 1, 20, NULL, 13),
  (@cat_food, 'products_prepacked', 'Are products Pre-Packed / Ready-to-Sell?', 'क्या उत्पाद पहले से पैक/बिक्री हेतु तैयार हैं?', 'select', 1, 10,
    JSON_ARRAY(JSON_OBJECT('value','yes','label','Yes'), JSON_OBJECT('value','no','label','No')), 14),
  (@cat_food, 'cooking_required', 'Will any cooking be required at the stall?', 'क्या स्टॉल पर खाना पकाने की आवश्यकता होगी?', 'select', 1, 10,
    JSON_ARRAY(JSON_OBJECT('value','no','label','No'), JSON_OBJECT('value','yes','label','Yes')), 15),
  (@cat_food, 'lpg_open_flame', 'Will LPG / Gas / Open Flame be used?', 'क्या एलपीजी/गैस/खुली लौ का उपयोग होगा?', 'select', 1, 10,
    JSON_ARRAY(JSON_OBJECT('value','no','label','No'), JSON_OBJECT('value','yes','label','Yes')), 16)
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi);

-- 4. Artisan Card Holder
SET @cat_artisan = (SELECT id FROM categories WHERE slug = 'artisan-card-holders' LIMIT 1);

INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, options_json, display_order)
VALUES
  (@cat_artisan, 'father_mother_name', 'Father''s / Mother''s Name', 'पिता/माता का नाम', 'text', 0, 191, NULL, 1),
  (@cat_artisan, 'artisan_card_number', 'Artisan Card Number', 'शिल्पकार कार्ड संख्या', 'text', 1, 100, NULL, 2),
  (@cat_artisan, 'artisan_card_issuing_dept', 'Artisan Card Issuing Department', 'शिल्पकार कार्ड जारीकर्ता विभाग', 'text', 1, 191, NULL, 3),
  (@cat_artisan, 'artisan_card_validity', 'Artisan Card Validity', 'शिल्पकार कार्ड वैधता', 'text', 1, 20, NULL, 4),
  (@cat_artisan, 'artisan_work_type', 'Type of Artisan Work', 'शिल्पकार कार्य का प्रकार', 'text', 1, 191, NULL, 5),
  (@cat_artisan, 'years_of_experience', 'Years of Experience', 'अनुभव (वर्ष)', 'text', 1, 10, NULL, 6),
  (@cat_artisan, 'artisan_work_description', 'Artisan Work Description', 'शिल्पकार कार्य का विवरण', 'textarea', 1, 1024, NULL, 7),
  (@cat_artisan, 'products_made', 'Products Made', 'निर्मित उत्पाद', 'textarea', 1, 1024, NULL, 8),
  (@cat_artisan, 'materials_used', 'Materials Used', 'उपयोग की गई सामग्री', 'text', 1, 512, NULL, 9),
  (@cat_artisan, 'traditional_local_art_details', 'Traditional / Local Art Details', 'पारंपरिक/स्थानीय कला विवरण', 'textarea', 0, 1024, NULL, 10),
  (@cat_artisan, 'speciality_of_work', 'Speciality of Your Work', 'कार्य की विशेषता', 'textarea', 0, 1024, NULL, 11)
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi);

-- 5. National Awardee
SET @cat_national = (SELECT id FROM categories WHERE slug = 'national-awardees' LIMIT 1);

INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, options_json, display_order)
VALUES
  (@cat_national, 'father_mother_name', 'Father''s / Mother''s Name', 'पिता/माता का नाम', 'text', 0, 191, NULL, 1),
  (@cat_national, 'award_name', 'Award Name', 'पुरस्कार का नाम', 'text', 1, 191, NULL, 2),
  (@cat_national, 'award_category', 'Award Category', 'पुरस्कार श्रेणी', 'text', 1, 191, NULL, 3),
  (@cat_national, 'award_year', 'Award Year', 'पुरस्कार वर्ष', 'text', 1, 10, NULL, 4),
  (@cat_national, 'awarding_authority', 'Awarding Authority', 'पुरस्कार प्रदान करने वाली संस्था', 'text', 1, 191, NULL, 5),
  (@cat_national, 'award_certificate_number', 'Award Certificate Number', 'पुरस्कार प्रमाणपत्र संख्या', 'text', 0, 100, NULL, 6),
  (@cat_national, 'award_description', 'Brief Description of Award', 'पुरस्कार का संक्षिप्त विवरण', 'textarea', 1, 1024, NULL, 7),
  (@cat_national, 'art_craft_type', 'Type of Art / Craft', 'कला/शिल्प का प्रकार', 'text', 1, 191, NULL, 8),
  (@cat_national, 'work_description', 'Work Description', 'कार्य विवरण', 'textarea', 1, 1024, NULL, 9),
  (@cat_national, 'product_description', 'Product Description', 'उत्पाद विवरण', 'textarea', 1, 1024, NULL, 10),
  (@cat_national, 'experience', 'Experience', 'अनुभव', 'text', 0, 191, NULL, 11)
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi);

-- 6. Brand Promotion
SET @cat_brand = (SELECT id FROM categories WHERE slug = 'brand-promotions' LIMIT 1);

INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, options_json, display_order)
VALUES
  (@cat_brand, 'business_type', 'Business Type', 'व्यवसाय का प्रकार', 'select', 1, 50,
    JSON_ARRAY(JSON_OBJECT('value','company','label','Company'), JSON_OBJECT('value','firm','label','Firm'), JSON_OBJECT('value','agency','label','Agency'), JSON_OBJECT('value','proprietorship','label','Proprietorship'), JSON_OBJECT('value','partnership','label','Partnership'), JSON_OBJECT('value','other','label','Other')), 1),
  (@cat_brand, 'registration_number', 'Registration Number', 'पंजीकरण संख्या', 'text', 1, 100, NULL, 2),
  (@cat_brand, 'gst_number', 'GST Number', 'जीएसटी नंबर', 'text', 0, 20, NULL, 3),
  (@cat_brand, 'pan_number', 'PAN Number', 'पैन नंबर', 'text', 0, 20, NULL, 4),
  (@cat_brand, 'website', 'Website', 'वेबसाइट', 'text', 0, 191, NULL, 5),
  (@cat_brand, 'business_email', 'Business Email', 'व्यवसाय ईमेल', 'text', 1, 191, NULL, 6),
  (@cat_brand, 'business_mobile_number', 'Business Mobile Number', 'व्यवसाय मोबाइल नंबर', 'text', 1, 15, NULL, 7),
  (@cat_brand, 'representative_designation', 'Representative Designation', 'प्रतिनिधि पदनाम', 'text', 1, 100, NULL, 8),
  (@cat_brand, 'brand_name', 'Brand Name', 'ब्रांड नाम', 'text', 1, 191, NULL, 9),
  (@cat_brand, 'product_service_name', 'Product / Service Name', 'उत्पाद/सेवा का नाम', 'text', 1, 191, NULL, 10),
  (@cat_brand, 'product_service_category', 'Product / Service Category', 'उत्पाद/सेवा श्रेणी', 'text', 1, 191, NULL, 11),
  (@cat_brand, 'brand_description', 'Brand Description', 'ब्रांड विवरण', 'textarea', 1, 1024, NULL, 12),
  (@cat_brand, 'promotion_purpose', 'What do you want to promote?', 'आप क्या प्रचारित करना चाहते हैं?', 'textarea', 1, 1024, NULL, 13),
  (@cat_brand, 'proposed_promotional_activities', 'Proposed Promotional Activities', 'प्रस्तावित प्रचार गतिविधियां', 'select', 1, 50,
    JSON_ARRAY(JSON_OBJECT('value','product_display','label','Product Display'), JSON_OBJECT('value','brand_awareness','label','Brand Awareness'), JSON_OBJECT('value','customer_interaction','label','Customer Interaction'), JSON_OBJECT('value','promotional_material','label','Promotional Material'), JSON_OBJECT('value','product_information','label','Product Information'), JSON_OBJECT('value','other','label','Other')), 14),
  (@cat_brand, 'promotion_activity_description', 'Brief description of proposed activity', 'प्रस्तावित गतिविधि का संक्षिप्त विवरण', 'textarea', 1, 1024, NULL, 15),
  (@cat_brand, 'display_requirements', 'Display requirements', 'प्रदर्शन आवश्यकताएं', 'text', 0, 512, NULL, 16),
  (@cat_brand, 'electricity_requirement', 'Electricity requirement', 'बिजली आवश्यकता', 'text', 0, 191, NULL, 17),
  (@cat_brand, 'approximate_staff', 'Approximate staff at stall', 'स्टॉल पर अनुमानित स्टाफ', 'text', 0, 50, NULL, 18),
  (@cat_brand, 'additional_requirements', 'Additional requirements', 'अतिरिक्त आवश्यकताएं', 'textarea', 0, 1024, NULL, 19)
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi);

-- 7. Self Help Group (SHG)
SET @cat_shg = (SELECT id FROM categories WHERE slug = 'self-help-groups' LIMIT 1);

INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, options_json, display_order)
VALUES
  (@cat_shg, 'shg_name', 'SHG Name', 'एसएचजी का नाम', 'text', 1, 191, NULL, 1),
  (@cat_shg, 'shg_registration_number', 'SHG Registration Number', 'एसएचजी पंजीकरण संख्या', 'text', 1, 100, NULL, 2),
  (@cat_shg, 'registration_date', 'Registration Date', 'पंजीकरण तिथि', 'text', 1, 20, NULL, 3),
  (@cat_shg, 'shg_location', 'SHG Location', 'एसएचजी का स्थान', 'text', 1, 191, NULL, 4),
  (@cat_shg, 'shg_member_count', 'Number of SHG Members', 'एसएचजी सदस्यों की संख्या', 'text', 1, 10, NULL, 5),
  (@cat_shg, 'shg_mobile_number', 'SHG Mobile Number', 'एसएचजी मोबाइल नंबर', 'text', 1, 15, NULL, 6),
  (@cat_shg, 'shg_email', 'SHG Email', 'एसएचजी ईमेल', 'text', 0, 191, NULL, 7),
  (@cat_shg, 'representative_designation', 'Designation / Role', 'पदनाम/भूमिका', 'text', 1, 100, NULL, 8),
  (@cat_shg, 'products_made', 'Products Made by SHG', 'एसएचजी द्वारा निर्मित उत्पाद', 'select', 1, 50,
    JSON_ARRAY(JSON_OBJECT('value','handicrafts','label','Handicrafts'), JSON_OBJECT('value','handmade_products','label','Handmade Products'), JSON_OBJECT('value','household_products','label','Household Products'), JSON_OBJECT('value','decorative_products','label','Decorative Products'), JSON_OBJECT('value','traditional_products','label','Traditional Products'), JSON_OBJECT('value','achar','label','Achar'), JSON_OBJECT('value','masale','label','Masale'), JSON_OBJECT('value','uncooked_papad','label','Uncooked Papad'), JSON_OBJECT('value','other','label','Other')), 9),
  (@cat_shg, 'product_description', 'Product Description', 'उत्पाद विवरण', 'textarea', 1, 1024, NULL, 10),
  (@cat_shg, 'manufacturing_process', 'Manufacturing / Making Process', 'निर्माण प्रक्रिया', 'textarea', 0, 1024, NULL, 11),
  (@cat_shg, 'shg_location_category', 'SHG Location Category', 'एसएचजी स्थान श्रेणी', 'select', 1, 50,
    JSON_ARRAY(JSON_OBJECT('value','haryana','label','Haryana'), JSON_OBJECT('value','outside_haryana','label','Outside Haryana')), 12)
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi);

-- 8. Special Art & Craft
SET @cat_special = (SELECT id FROM categories WHERE slug = 'special-art-craft' LIMIT 1);

INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, options_json, display_order)
VALUES
  (@cat_special, 'art_craft_name', 'Art / Craft Name', 'कला/शिल्प का नाम', 'text', 1, 191, NULL, 1),
  (@cat_special, 'art_craft_type', 'Type of Art & Craft', 'कला एवं शिल्प का प्रकार', 'text', 1, 191, NULL, 2),
  (@cat_special, 'traditional_local_art_details', 'Traditional / Local Art Details', 'पारंपरिक/स्थानीय कला विवरण', 'textarea', 0, 1024, NULL, 3),
  (@cat_special, 'products_to_display', 'Products to be Displayed', 'प्रदर्शित किए जाने वाले उत्पाद', 'textarea', 1, 1024, NULL, 4),
  (@cat_special, 'materials_used', 'Materials Used', 'उपयोग की गई सामग्री', 'text', 1, 512, NULL, 5),
  (@cat_special, 'craft_process', 'Manufacturing / Craft Process', 'निर्माण/शिल्प प्रक्रिया', 'textarea', 0, 1024, NULL, 6),
  (@cat_special, 'years_of_experience', 'Years of Experience', 'अनुभव (वर्ष)', 'text', 0, 10, NULL, 7),
  (@cat_special, 'craft_uniqueness', 'What makes your Craft unique?', 'आपकी शिल्पकला किस प्रकार विशिष्ट है?', 'textarea', 1, 1024, NULL, 8),
  (@cat_special, 'craft_business_registration_number', 'Craft / Business Registration Number', 'शिल्प/व्यवसाय पंजीकरण संख्या', 'text', 0, 100, NULL, 9),
  (@cat_special, 'artisan_craft_certificate_number', 'Artisan / Craft Certificate Number', 'शिल्पकार/शिल्प प्रमाणपत्र संख्या', 'text', 0, 100, NULL, 10)
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi);

-- 9. Wooden Craft & Carpets — Large Space
SET @cat_wooden = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets' LIMIT 1);

INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, options_json, display_order)
VALUES
  (@cat_wooden, 'business_firm_name', 'Business / Firm Name', 'व्यवसाय/फर्म का नाम', 'text', 0, 191, NULL, 1),
  (@cat_wooden, 'business_registration_number', 'Business Registration Number', 'व्यवसाय पंजीकरण संख्या', 'text', 0, 100, NULL, 2),
  (@cat_wooden, 'gst_number', 'GST Number', 'जीएसटी नंबर', 'text', 0, 20, NULL, 3),
  (@cat_wooden, 'pan_number', 'PAN Number', 'पैन नंबर', 'text', 0, 20, NULL, 4),
  (@cat_wooden, 'years_in_business', 'Years in Business', 'व्यवसाय में अनुभव (वर्ष)', 'text', 0, 10, NULL, 5),
  (@cat_wooden, 'product_category', 'Product Category', 'उत्पाद श्रेणी', 'select', 1, 50,
    JSON_ARRAY(JSON_OBJECT('value','wooden_craft','label','Wooden Craft'), JSON_OBJECT('value','wooden_furniture','label','Wooden Furniture'), JSON_OBJECT('value','large_wooden_decorative_items','label','Large Wooden Decorative Items'), JSON_OBJECT('value','handmade_carpets','label','Handmade Carpets'), JSON_OBJECT('value','rugs','label','Rugs'), JSON_OBJECT('value','large_handcrafted_products','label','Large Handcrafted Products'), JSON_OBJECT('value','other','label','Other')), 6),
  (@cat_wooden, 'product_description', 'Product Description', 'उत्पाद विवरण', 'textarea', 1, 1024, NULL, 7),
  (@cat_wooden, 'products_count', 'Number of Products to be Displayed', 'प्रदर्शित किए जाने वाले उत्पादों की संख्या', 'text', 1, 10, NULL, 8),
  (@cat_wooden, 'largest_product_size', 'Approximate Size of Largest Product', 'सबसे बड़े उत्पाद का अनुमानित आकार', 'text', 1, 191, NULL, 9),
  (@cat_wooden, 'work_product_description', 'Work / Product Description', 'कार्य/उत्पाद विवरण', 'textarea', 0, 1024, NULL, 10),
  (@cat_wooden, 'large_space_reason', 'Why do you require Large Space?', 'बड़े स्थान की आवश्यकता क्यों है?', 'textarea', 1, 1024, NULL, 11),
  (@cat_wooden, 'approximate_space_required', 'Approximate Space Required', 'अनुमानित आवश्यक स्थान', 'text', 1, 191, NULL, 12),
  (@cat_wooden, 'stall_length', 'Expected Stall Length', 'अपेक्षित स्टॉल लंबाई', 'text', 0, 50, NULL, 13),
  (@cat_wooden, 'stall_width', 'Expected Stall Width', 'अपेक्षित स्टॉल चौड़ाई', 'text', 0, 50, NULL, 14),
  (@cat_wooden, 'large_products_count', 'Number of Large Products', 'बड़े उत्पादों की संख्या', 'text', 0, 10, NULL, 15),
  (@cat_wooden, 'special_display_requirements', 'Special Display Requirements', 'विशेष प्रदर्शन आवश्यकताएं', 'textarea', 0, 1024, NULL, 16),
  (@cat_wooden, 'electricity_requirement', 'Electricity Requirement', 'बिजली आवश्यकता', 'text', 0, 191, NULL, 17),
  (@cat_wooden, 'other_space_requirements', 'Other Space Requirements', 'अन्य स्थान आवश्यकताएं', 'textarea', 0, 1024, NULL, 18)
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi);

-- Fee/allotment amount updates per the confirmed spec. Application fee
-- (fee_paise) is already ₹236 for all 8 paid categories and ₹0 for
-- Government — unchanged. Only allotment_amount_paise (the POST-SELECTION
-- stall fee, distinct from the application fee) is updated here to match
-- the newly confirmed figures.
UPDATE categories SET allotment_amount_paise = 3000000, allotment_amount_note = NULL, allotment_amount_note_hi = NULL
WHERE slug = 'artisan-card-holders'; -- ₹30,000 (already matched; re-asserted for clarity)

UPDATE categories SET allotment_amount_paise = 3000000, allotment_amount_note = NULL, allotment_amount_note_hi = NULL
WHERE slug = 'special-art-craft'; -- ₹30,000

UPDATE categories SET allotment_amount_paise = 6000000, allotment_amount_note = NULL, allotment_amount_note_hi = NULL
WHERE slug = 'wooden-craft-carpets'; -- ₹60,000 (Large Space)

UPDATE categories SET allotment_amount_paise = 0, allotment_amount_note = 'Free Stall', allotment_amount_note_hi = 'निःशुल्क स्टॉल'
WHERE slug = 'self-help-groups'; -- Stall Fee: FREE
