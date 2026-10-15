-- Self Help Groups (SHG): card / key-facts content and deadline supplied
-- verbatim by the business. Application closes 28 Oct 2026 23:59:59 IST.
-- Fee (₹236) and allotment (free) were already correct and are unchanged.
UPDATE categories SET
  description = 'Stalls are reserved for registered Self Help Groups (SHGs). If the number of eligible applications is within the available stall limit, stalls will be allotted directly. If applications exceed the available stall limit, allotment will be done through a Draw.',
  description_hi = 'पंजीकृत स्वयं सहायता समूहों (SHGs) के लिए स्टॉल आरक्षित हैं। निर्धारित स्टॉल सीमा के भीतर पात्र आवेदन प्राप्त होने पर सीधा आबंटन होगा। अधिक आवेदन प्राप्त होने पर ड्रॉ के माध्यम से आबंटन किया जाएगा।',
  application_closes_at = '2026-10-28 23:59:59'
WHERE slug = 'self-help-groups';
