-- Government Departments: card / key-facts content and application deadline
-- supplied verbatim by the business. Application closes 28 Oct 2026 23:59:59
-- IST (stored as IST wall-clock, as elsewhere in this table). Fee stays 0.
UPDATE categories SET
  description = 'Booths/Stalls for eligible Central and State Government departments to provide public information, promote government schemes, and support public awareness. Allotment is subject to document verification and KDB approval.',
  description_hi = 'केंद्र और राज्य सरकार के पात्र विभागों के लिए सरकारी जानकारी देने, सरकारी योजनाओं का प्रचार करने और जन जागरूकता बढ़ाने हेतु बूथ/स्टॉल उपलब्ध होंगे। बूथ/स्टॉल का आवंटन दस्तावेजों की जांच और KDB की स्वीकृति के अधीन होगा।',
  allotment_amount_note = 'Free of Cost for eligible and verified government departments',
  allotment_amount_note_hi = 'पात्र और सत्यापित सरकारी विभागों के लिए निःशुल्क',
  application_closes_at = '2026-10-28 23:59:59'
WHERE slug = 'govt-departments';
