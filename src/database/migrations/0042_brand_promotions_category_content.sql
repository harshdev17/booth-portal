-- Brand Promotion & Corporate: card / key-facts content supplied verbatim by
-- the business. Allotment is now handled by an agency appointed by KDB
-- (contacts the applicant directly after review) rather than a fixed small/
-- large shop rate, so the old allotment_amount_note no longer applies.
UPDATE categories SET
  description = 'Commercial and promotional booths/stalls will be available at prime locations for promoting your brand, company, or organization. Booth/stall allotment is through the agency appointed by KDB; the agency will contact you directly after reviewing your application.',
  description_hi = 'ब्रांड, कंपनी या संगठन के प्रचार हेतु प्रमुख स्थानों पर व्यावसायिक एवं प्रचार बूथ/स्टॉल उपलब्ध होंगे। बूथ/स्टॉल का आबंटन KDB द्वारा नियुक्त एजेंसी के माध्यम से होगा; आवेदन की जाँच के बाद एजेंसी आवेदक से सीधे संपर्क करेगी।',
  allotment_amount_note = 'To be communicated by the agency appointed by KDB',
  allotment_amount_note_hi = 'KDB द्वारा नियुक्त एजेंसी द्वारा बताई जाएगी',
  application_opens_at = '2026-10-14 00:00:00',
  application_closes_at = '2026-10-28 23:59:59'
WHERE slug = 'brand-promotions';
