-- Special Art & Craft -> renamed "Art & Craft" per business-supplied content,
-- with card/key facts and schedule. Dates are IST wall-clock values: opens
-- 14 Oct, closes 28 Oct 2026 23:59:59; draw/result date 5 Nov (date only,
-- same as Artisan Card Holders / National Awardees). Fee (₹236) and
-- allotment amount (₹30,000) were already correct and are left unchanged.
UPDATE categories SET
  name = 'Art & Craft',
  name_hi = 'आर्ट एंड क्राफ्ट',
  description = 'Special booths/stalls are available for artists and craft workers who create attractive and quality art and craft products. Applicants can apply under this category even if they do not have an Artisan Card or National/State Award Certificate. This is a special opportunity for talented artists and craft workers to display and sell their own handmade products during International Gita Jayanti Mahotsav 2026.',
  description_hi = 'यह श्रेणी उन कलाकारों और हस्तशिल्प कारीगरों के लिए है, जो अच्छी गुणवत्ता वाले सुंदर आर्ट एंड क्राफ्ट उत्पाद बनाते हैं। इस श्रेणी में आवेदन करने के लिए आर्टिजन कार्ड या राष्ट्रीय/राज्य पुरस्कार प्रमाणपत्र होना अनिवार्य नहीं है। अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 के दौरान कलाकारों और हस्तशिल्प कारीगरों को अपने बनाए उत्पादों को प्रदर्शित करने और बेचने का विशेष अवसर दिया जा रहा है।',
  application_opens_at = '2026-10-14 00:00:00',
  application_closes_at = '2026-10-28 23:59:59',
  auction_date = '2026-11-05 00:00:00'
WHERE slug = 'special-art-craft';
