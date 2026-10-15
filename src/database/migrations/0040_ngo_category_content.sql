-- Social Organizations (Registered): card / key-facts content and deadline
-- supplied verbatim by the business. Application closes 28 Oct 2026 23:59:59
-- IST (stored as IST wall-clock, as elsewhere in this table). Fee and
-- allotment amount are intentionally not touched here.
UPDATE categories SET
  name_hi = 'सामाजिक संगठन (पंजीकृत सामाजिक संगठन)',
  description = 'This category is for registered NGOs and social service organizations. Eligible organizations will be provided with free booths/stalls. All applications will be verified by the Kurukshetra Development Board (KDB). Please read the guidelines given below carefully for detailed information about the booth/stall allotment process.',
  description_hi = 'यह श्रेणी पंजीकृत NGO और सामाजिक सेवा संगठनों के लिए है। इस श्रेणी में पात्र संगठनों को निःशुल्क बूथ/स्टॉल उपलब्ध करवाए जाएंगे। सभी आवेदनों की जाँच कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा की जाएगी। बूथ/स्टॉल आबंटन के बारे में अधिक जानकारी के लिए नीचे दी गई गाइडलाइन्स को अवश्य पढ़ें।',
  application_closes_at = '2026-10-28 23:59:59'
WHERE slug = 'ngos-social-organizations';
