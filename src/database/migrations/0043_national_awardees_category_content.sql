-- National Awardees: card / key-facts content and schedule supplied
-- verbatim by the business. Dates are IST wall-clock values: applications
-- open 14 Oct 2026, close 28 Oct 2026 23:59:59; draw/result date 5 Nov 2026
-- (date only; no time given, matching the Artisan Card Holders pattern).
-- Allotment amount is now a fixed ₹30,000 (was "As decided by KDB").
UPDATE categories SET
  description = 'Special booths/stalls for national and state award-winning artisans. Booth/stall will be allotted directly if the applicant is within the available booth/stall limit. If the number of eligible applicants exceeds the available booths/stalls, allotment will be conducted through a Draw.',
  description_hi = 'यह श्रेणी राष्ट्रीय पुरस्कार विजेता पात्र कारीगरों के लिए विशेष स्टॉल/बूथ आरक्षित हैं। पात्र पाए गए आवेदकों की संख्या उपलब्ध स्टॉल/बूथ की सीमा के भीतर रहती है, तो सीधे आबंटन किया जाएगा। आवेदकों की संख्या उपलब्ध स्टॉल/बूथ से अधिक होती है, तो ड्रॉ के माध्यम से आबंटन किया जाएगा।',
  allotment_amount_paise = 3000000,
  allotment_amount_note = NULL,
  allotment_amount_note_hi = NULL,
  application_opens_at = '2026-10-14 00:00:00',
  application_closes_at = '2026-10-28 23:59:59',
  auction_date = '2026-11-05 00:00:00'
WHERE slug = 'national-awardees';
