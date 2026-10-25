-- Migration 0058: Rename "Special Items" to "Special Food Items" for the
-- Sweets & Special Items category (reported live — the category deals
-- exclusively in food items, so the name should say so explicitly).
UPDATE categories SET
  name = 'Sweets & Special Food Items',
  name_hi = 'मिष्ठान एवं विशेष खाद्य वस्तुएं',
  description = 'Booths/Stalls are reserved for verified sellers of sweets and special food items. After checking the application and documents, booth/stall will be given directly if the number of eligible applicants is within the available booth/stall limit. If there are more eligible applicants than available booth/stall, the booth/stall will be allotted through a Draw. Please read the guidelines carefully before applying.',
  description_hi = 'मिष्ठान एवं विशेष खाद्य वस्तुओं के सत्यापित विक्रेताओं के लिए बूथ/स्टॉल आरक्षित हैं। आवेदन और दस्तावेज़ों की जाँच के बाद, यदि पात्र पाए गए आवेदकों की संख्या उपलब्ध बूथ/स्टॉल की सीमा के भीतर रहती है, तो सीधे आबंटन किया जाएगा। यदि पात्र आवेदकों की संख्या उपलब्ध बूथ/स्टॉल से अधिक होती है, तो ड्रॉ के माध्यम से बूथ/स्टॉल आबंटित किए जाएंगे। आवेदन करने से पहले कृपया गाइडलाइन्स ध्यानपूर्वक पढ़ें।'
WHERE slug = 'sweets-special-items';

SET @category_id = (SELECT id FROM categories WHERE slug = 'sweets-special-items' LIMIT 1);

UPDATE category_field_definitions SET
  label = 'Description of Sweets / Special Food Items Sold',
  label_hi = 'बेचे जाने वाले मिष्ठान/विशेष खाद्य वस्तुओं का विवरण'
WHERE category_id = @category_id AND field_key = 'products_description';
