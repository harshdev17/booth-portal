-- Migration 0011: Seed the notices table with the 5 notices previously
-- hardcoded in HeaderMarquee.tsx, so the homepage marquee shows the same
-- content immediately after this ships — admins can then edit/reorder/
-- add/remove from here on via /admin/settings/notices.

SET NAMES utf8mb4;

INSERT INTO notices (text, text_hi, display_order, status)
SELECT * FROM (SELECT
  'International Gita Mahotsav 2026: Online application process for commercial stalls and booths is now live.' AS text,
  'अंतर्राष्ट्रीय गीता महोत्सव 2026: व्यावसायिक स्टॉल एवं दुकानों हेतु ऑनलाइन आवेदन प्रक्रिया प्रारंभ हो चुकी है।' AS text_hi,
  1 AS display_order, 'active' AS status
UNION ALL SELECT
  'Please ensure all mandatory documents are uploaded before the closing deadline.',
  'आवेदन करने की अंतिम तिथि से पूर्व अपने आवश्यक दस्तावेज पोर्टल पर अपलोड करें।', 2, 'active'
UNION ALL SELECT
  'NGO stalls are free of cost and will be decided manually by Kurukshetra Development Board (KDB).',
  'एन.जी.ओ. स्टॉल पूर्णतः निःशुल्क हैं एवं कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा निर्णय लिया जाएगा।', 3, 'active'
UNION ALL SELECT
  'Refreshment & Food stalls will be auctioned manually by KDB.',
  'रिफ्रेशमेंट/खान-पान स्टॉल की नीलामी KDB द्वारा प्रत्यक्ष (मैनुअल) रूप से की जाएगी।', 4, 'active'
UNION ALL SELECT
  'Refer exclusively to this official portal for genuine draw results and stall allotment notifications.',
  'आवंटन एवं लकी ड्रॉ संबंधी आधिकारिक सूचना हेतु केवल इसी पोर्टल का संदर्भ लें।', 5, 'active'
) AS seed_data
WHERE NOT EXISTS (SELECT 1 FROM notices);
