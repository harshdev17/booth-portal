-- Migration 0050: Update Category Details form fields per client instructions:
-- 1. Social Organizations (ngos-social-organizations):
--    Remove 'NGO' from organization_type options because all social organisations are NGOs.
--    Options: Society, Trust, Registered under Companies Act, Others.
-- 2. Government Departments (govt-departments):
--    Deactivate 'department_type', 'officer_designation', and 'government_id_number'.
--    Keep 'organisation_name' (Department Name) and update 'service_requirement' to
--    'Public Service Details' with section 'Service Details'.
-- 3. Brand Promotion & Corporate (brand-promotions):
--    Deactivate duplicate contact columns: 'business_email', 'business_mobile_number',
--    and 'representative_designation' in Category Details.

SET NAMES utf8mb4;

-- 1. Social Organizations: update organization_type options
UPDATE category_field_definitions
SET options_json = JSON_ARRAY(
  JSON_OBJECT('value', 'society', 'label', 'Society'),
  JSON_OBJECT('value', 'trust', 'label', 'Trust'),
  JSON_OBJECT('value', 'registered_under_companies_act', 'label', 'Registered under Companies Act'),
  JSON_OBJECT('value', 'others', 'label', 'Others')
)
WHERE category_id = (SELECT id FROM categories WHERE slug = 'ngos-social-organizations')
  AND field_key = 'organization_type';

-- 2. Government Departments: deactivate 3 fields, update Department Name & Public Service Details
UPDATE category_field_definitions
SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments')
  AND field_key IN ('department_type', 'officer_designation', 'government_id_number');

UPDATE category_field_definitions
SET label = 'Public Service Details',
    label_hi = 'सार्वजनिक सेवा का विवरण',
    section = 'Service Details',
    section_hi = 'सेवा का विवरण',
    is_required = 1,
    display_order = 2
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments')
  AND field_key = 'service_requirement';

UPDATE category_field_definitions
SET display_order = 1,
    section = 'Department Details',
    section_hi = 'विभाग का विवरण',
    is_required = 1
WHERE category_id = (SELECT id FROM categories WHERE slug = 'govt-departments')
  AND field_key = 'organisation_name';

-- 3. Brand Promotion & Corporate: deactivate duplicate contact columns
UPDATE category_field_definitions
SET status = 'inactive', is_required = 0
WHERE category_id = (SELECT id FROM categories WHERE slug = 'brand-promotions')
  AND field_key IN ('business_email', 'business_mobile_number', 'representative_designation');
