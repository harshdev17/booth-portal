-- Category 7 (Wooden Craft & Carpets (Large Space)): card / key-facts content
-- supplied verbatim by the business (English + Hindi). Fee (Rs 236) and
-- allotment amount (Rs 60,000) are already correct in the row and unchanged.
-- The long guideline text, required-document list and "Before You Start"
-- panel live in src/lib/content/{category-guidelines,apply-instructions}.ts.
UPDATE categories SET
  name_hi = 'लकड़ी के हस्तशिल्प एवं कालीन (बड़े स्थान वाले बूथ/स्टॉल)',
  description = 'Large-format spaces for wooden crafts, wooden furniture, handmade carpets, rugs, and other large craft products.',
  description_hi = 'लकड़ी के हस्तशिल्प, लकड़ी के फर्नीचर, हाथ से बने कालीन, गलीचे और अन्य बड़े हस्तशिल्प उत्पादों के लिए बड़े आकार के बूथ/स्टॉल/स्थान उपलब्ध कराए जाएंगे।'
WHERE slug = 'wooden-craft-carpets';
