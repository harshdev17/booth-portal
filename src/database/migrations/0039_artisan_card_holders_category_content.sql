-- Artisan Card Holders: card / key-facts content and schedule supplied
-- verbatim by the business. Dates are IST wall-clock values: applications
-- open 14 Oct 2026, close 28 Oct 2026 23:59:59; draw/result date 5 Nov 2026
-- (date only; no time was given). Fee and allotment amount are unchanged.
UPDATE categories SET
  name_hi = 'आर्टिजन कार्ड धारक',
  description = 'Booths/Stalls are reserved for verified artisan card holders. After checking the application and documents, booth/stall will be given directly if the number of eligible applicants is within the available booth/stall limit. If there are more eligible applicants than available booth/stall, the booth/stall will be allotted through a Draw. Please read the guidelines carefully before applying.',
  description_hi = 'सत्यापित आर्टिजन कार्ड धारकों के लिए बूथ/स्टॉल आरक्षित हैं। आवेदन और दस्तावेज़ों की जाँच के बाद, यदि पात्र पाए गए आवेदकों की संख्या उपलब्ध बूथ/स्टॉल की सीमा के भीतर रहती है, तो सीधे आबंटन किया जाएगा। यदि पात्र आवेदकों की संख्या उपलब्ध बूथ/स्टॉल से अधिक होती है, तो ड्रॉ के माध्यम से बूथ/स्टॉल आबंटित किए जाएंगे। आवेदन करने से पहले कृपया गाइडलाइन्स ध्यानपूर्वक पढ़ें।',
  application_opens_at = '2026-10-14 00:00:00',
  application_closes_at = '2026-10-28 23:59:59',
  auction_date = '2026-11-05 00:00:00'
WHERE slug = 'artisan-card-holders';
