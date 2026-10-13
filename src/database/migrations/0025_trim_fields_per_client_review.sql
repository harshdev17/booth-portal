-- Migration 0025: form fields trimmed to the client's marked-up review.
--
-- 1. Every category's field list is cut to the questions the client kept
--    (everything else becomes status='inactive' — never deleted, so answers
--    already stored on old applications still display).
-- 2. Labels reworded where the client asked (e.g. SHG "Location" -> "SHG
--    Address", Wooden "Product Description" -> "Name of Products"), Government
--    "Government / Department Type" becomes a plain text box, NGO "Activities
--    proposed at the Mahotsav Stall" becomes a short text box.
-- 3. New Government field "Service Requirement".
-- 4. Brand: Brand Name and Product / Service Name moved up to 2nd/3rd.
-- 5. categories.show_remarks: the "Other Remarks" box is switched off for NGO.

SET NAMES utf8mb4;

ALTER TABLE categories ADD COLUMN show_remarks TINYINT(1) NOT NULL DEFAULT 1;
UPDATE categories SET show_remarks = 0 WHERE slug = 'ngos-social-organizations';

INSERT INTO category_field_definitions (category_id, field_key, label, label_hi, input_type, is_required, max_length, display_order)
SELECT id, 'service_requirement', 'Service Requirement', 'सेवा की आवश्यकता', 'textarea', 0, 512, 99
FROM categories WHERE slug = 'govt-departments'
ON DUPLICATE KEY UPDATE field_key = field_key;

-- ngos-social-organizations
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND status = 'active' AND field_key NOT IN ('organisation_name', 'ngo_registration_number', 'registration_date', 'organization_type', 'proposed_stall_activities');
UPDATE category_field_definitions SET label = 'Stall Activities', label_hi = 'स्टॉल पर प्रस्तावित गतिविधि', input_type = 'text', max_length = 255, options_json = NULL
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'proposed_stall_activities';
UPDATE category_field_definitions SET display_order = 1, section = 'Organisation Details', section_hi = 'संस्था का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'organisation_name';
UPDATE category_field_definitions SET display_order = 2, section = 'Organisation Details', section_hi = 'संस्था का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'ngo_registration_number';
UPDATE category_field_definitions SET display_order = 3, section = 'Organisation Details', section_hi = 'संस्था का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'registration_date';
UPDATE category_field_definitions SET display_order = 4, section = 'Organisation Details', section_hi = 'संस्था का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'organization_type';
UPDATE category_field_definitions SET display_order = 5, section = 'Stall Details', section_hi = 'स्टॉल का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations') AND field_key = 'proposed_stall_activities';

-- refreshment-stalls
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND status = 'active' AND field_key NOT IN ('business_firm_name', 'pan_number', 'gst_number', 'business_registration_number', 'fssai_license_number', 'fssai_validity_date');
UPDATE category_field_definitions SET display_order = 1, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'business_firm_name';
UPDATE category_field_definitions SET display_order = 2, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'pan_number';
UPDATE category_field_definitions SET display_order = 3, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'gst_number';
UPDATE category_field_definitions SET display_order = 4, section = 'Business Details', section_hi = 'व्यवसाय का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'business_registration_number';
UPDATE category_field_definitions SET display_order = 5, section = 'FSSAI License', section_hi = 'FSSAI लाइसेंस'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'fssai_license_number';
UPDATE category_field_definitions SET display_order = 6, section = 'FSSAI License', section_hi = 'FSSAI लाइसेंस'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'refreshment-stalls') AND field_key = 'fssai_validity_date';

-- self-help-groups
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND status = 'active' AND field_key NOT IN ('shg_location_category', 'shg_name', 'shg_registration_number', 'registration_date', 'shg_location', 'shg_member_count', 'product_description');
UPDATE category_field_definitions SET label = 'SHG Address', label_hi = 'स्वयं सहायता समूह का पता'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_location';
UPDATE category_field_definitions SET label = 'SHG Address Category', label_hi = 'स्वयं सहायता समूह के पते की श्रेणी'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_location_category';
UPDATE category_field_definitions SET label = 'Product Description (what you sell)', label_hi = 'बेचे जाने वाले उत्पाद का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'product_description';
UPDATE category_field_definitions SET display_order = 1, section = 'SHG Details', section_hi = 'स्वयं सहायता समूह का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_location_category';
UPDATE category_field_definitions SET display_order = 2, section = 'SHG Details', section_hi = 'स्वयं सहायता समूह का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_name';
UPDATE category_field_definitions SET display_order = 3, section = 'SHG Details', section_hi = 'स्वयं सहायता समूह का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_registration_number';
UPDATE category_field_definitions SET display_order = 4, section = 'SHG Details', section_hi = 'स्वयं सहायता समूह का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'registration_date';
UPDATE category_field_definitions SET display_order = 5, section = 'SHG Details', section_hi = 'स्वयं सहायता समूह का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_location';
UPDATE category_field_definitions SET display_order = 6, section = 'SHG Details', section_hi = 'स्वयं सहायता समूह का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'shg_member_count';
UPDATE category_field_definitions SET display_order = 7, section = 'Products', section_hi = 'उत्पाद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'self-help-groups') AND field_key = 'product_description';

-- artisan-card-holders
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND status = 'active' AND field_key NOT IN ('artisan_card_number', 'artisan_card_validity', 'artisan_work_type', 'years_of_experience', 'artisan_work_description');
UPDATE category_field_definitions SET label = 'Description of Products Made', label_hi = 'बनाए गए उत्पाद का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'artisan_work_description';
UPDATE category_field_definitions SET display_order = 1, section = 'Artisan Card', section_hi = 'कारीगर कार्ड'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'artisan_card_number';
UPDATE category_field_definitions SET display_order = 2, section = 'Artisan Card', section_hi = 'कारीगर कार्ड'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'artisan_card_validity';
UPDATE category_field_definitions SET display_order = 3, section = 'Artisan Work', section_hi = 'कारीगरी का कार्य'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'artisan_work_type';
UPDATE category_field_definitions SET display_order = 4, section = 'Artisan Work', section_hi = 'कारीगरी का कार्य'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'years_of_experience';
UPDATE category_field_definitions SET display_order = 5, section = 'Artisan Work', section_hi = 'कारीगरी का कार्य'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'artisan-card-holders') AND field_key = 'artisan_work_description';

-- national-awardees
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'national-awardees') AND status = 'active' AND field_key NOT IN ('award_name', 'award_category', 'award_year', 'awarding_authority', 'award_certificate_number', 'award_description', 'art_craft_type', 'experience', 'work_description');
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

-- special-art-craft
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND status = 'active' AND field_key NOT IN ('art_craft_name', 'products_to_display', 'years_of_experience');
UPDATE category_field_definitions SET display_order = 1, section = 'Craft Details', section_hi = 'शिल्प का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'art_craft_name';
UPDATE category_field_definitions SET display_order = 2, section = 'Craft Details', section_hi = 'शिल्प का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'products_to_display';
UPDATE category_field_definitions SET display_order = 3, section = 'Craft Details', section_hi = 'शिल्प का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'special-art-craft') AND field_key = 'years_of_experience';

-- wooden-craft-carpets
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND status = 'active' AND field_key NOT IN ('business_firm_name', 'business_registration_number', 'gst_number', 'pan_number', 'years_in_business', 'product_category', 'product_description');
UPDATE category_field_definitions SET label = 'GST Number, if applicable', label_hi = 'जीएसटी नंबर, यदि लागू हो'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'gst_number';
UPDATE category_field_definitions SET label = 'Name of Products', label_hi = 'उत्पादों के नाम'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'wooden-craft-carpets') AND field_key = 'product_description';
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

-- govt-departments
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND status = 'active' AND field_key NOT IN ('organisation_name', 'department_type', 'officer_designation', 'government_id_number', 'service_requirement');
UPDATE category_field_definitions SET label = 'Government / Department Type', label_hi = 'सरकारी / विभाग का प्रकार', input_type = 'text', max_length = 191, options_json = NULL
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'department_type';
UPDATE category_field_definitions SET label = 'Government Employee Designation', label_hi = 'सरकारी कर्मचारी का पद'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'officer_designation';
UPDATE category_field_definitions SET label = 'Government ID Number of the Officer', label_hi = 'अधिकारी का सरकारी पहचान पत्र संख्या'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'government_id_number';
UPDATE category_field_definitions SET display_order = 1, section = 'Department Details', section_hi = 'विभाग का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'organisation_name';
UPDATE category_field_definitions SET display_order = 2, section = 'Department Details', section_hi = 'विभाग का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'department_type';
UPDATE category_field_definitions SET display_order = 3, section = 'Department Details', section_hi = 'विभाग का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'officer_designation';
UPDATE category_field_definitions SET display_order = 4, section = 'Department Details', section_hi = 'विभाग का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'government_id_number';
UPDATE category_field_definitions SET display_order = 5, section = 'Service', section_hi = 'सेवा'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments') AND field_key = 'service_requirement';

-- brand-promotions
UPDATE category_field_definitions SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND status = 'active' AND field_key NOT IN ('organisation_name', 'brand_name', 'product_service_name', 'business_type', 'registration_number', 'gst_number', 'pan_number', 'website', 'business_email', 'business_mobile_number', 'representative_designation', 'product_service_category', 'brand_description', 'promotion_purpose');
UPDATE category_field_definitions SET display_order = 1, section = 'Company & Brand Details', section_hi = 'कंपनी और ब्रांड का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'organisation_name';
UPDATE category_field_definitions SET display_order = 2, section = 'Company & Brand Details', section_hi = 'कंपनी और ब्रांड का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'brand_name';
UPDATE category_field_definitions SET display_order = 3, section = 'Company & Brand Details', section_hi = 'कंपनी और ब्रांड का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'product_service_name';
UPDATE category_field_definitions SET display_order = 4, section = 'Company & Brand Details', section_hi = 'कंपनी और ब्रांड का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'business_type';
UPDATE category_field_definitions SET display_order = 5, section = 'Company & Brand Details', section_hi = 'कंपनी और ब्रांड का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'registration_number';
UPDATE category_field_definitions SET display_order = 6, section = 'Company & Brand Details', section_hi = 'कंपनी और ब्रांड का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'gst_number';
UPDATE category_field_definitions SET display_order = 7, section = 'Company & Brand Details', section_hi = 'कंपनी और ब्रांड का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'pan_number';
UPDATE category_field_definitions SET display_order = 8, section = 'Company & Brand Details', section_hi = 'कंपनी और ब्रांड का विवरण'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'website';
UPDATE category_field_definitions SET display_order = 9, section = 'Contact', section_hi = 'संपर्क'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'business_email';
UPDATE category_field_definitions SET display_order = 10, section = 'Contact', section_hi = 'संपर्क'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'business_mobile_number';
UPDATE category_field_definitions SET display_order = 11, section = 'Contact', section_hi = 'संपर्क'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'representative_designation';
UPDATE category_field_definitions SET display_order = 12, section = 'Promotion', section_hi = 'प्रचार'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'product_service_category';
UPDATE category_field_definitions SET display_order = 13, section = 'Promotion', section_hi = 'प्रचार'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'brand_description';
UPDATE category_field_definitions SET display_order = 14, section = 'Promotion', section_hi = 'प्रचार'
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions') AND field_key = 'promotion_purpose';

