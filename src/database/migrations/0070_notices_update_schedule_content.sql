-- Migration 0070: Replace the homepage notices with the current,
-- business-supplied schedule/announcement content. The 5 notices seeded
-- in migration 0011 were early placeholder content (stale category names
-- like "Refreshment & Food stalls", a generic NGO-fee statement) — soft-
-- disabled rather than deleted, matching this project's established
-- pattern elsewhere (category_document_definitions, etc.).
UPDATE notices SET status = 'inactive';

INSERT INTO notices (text, text_hi, display_order, status)
VALUES
  ('Application Period: 29 October 2026 to 7 November 2026 (until 5:00 PM).',
   'ऑनलाइन आवेदन की अवधि: 29 अक्टूबर 2026, 10:00 am से 7 नवंबर 2026 तक (5:00 pm तक)।',
   1, 'active'),
  ('Please do not wait until the last date. Fill out the application form correctly and upload all required documents clearly before the deadline.',
   'कृपया अंतिम तिथि का इंतज़ार न करें। अंतिम तिथि से पहले ही आवेदन फॉर्म सही तरीके से भरें और सभी आवश्यक दस्तावेज़ स्पष्ट एवं सही तरीके से अपलोड करें।',
   2, 'active'),
  ('Social Organisation booths/stalls will be allotted free of cost. Applicants only need to apply online and pay a non-refundable application fee of ₹236.',
   'सामाजिक संगठनों के बूथ/स्टॉल का आबंटन निःशुल्क किया जाएगा। इसके लिए केवल ऑनलाइन आवेदन करना होगा और ₹236 आवेदन शुल्क का भुगतान करना होगा। आवेदन शुल्क गैर-वापसी योग्य (Non-Refundable) है।',
   3, 'active'),
  ('Refreshment and Ice Cream Booths/Stalls will be allotted through a physical auction by KDB on 13 November 2026 at 10:00 AM onwards at Sri Krishna Museum, Near Panorama Science Centre, KDB Road, Thanesar, Kurukshetra.',
   'जलपान एवं आइसक्रीम बूथ/स्टॉल का आबंटन फिजिकल ऑक्शन के माध्यम से किया जाएगा। फिजिकल ऑक्शन 13 नवंबर 2026 को श्री कृष्ण संग्रहालय, पैनोरमा साइंस सेंटर के पास, KDB रोड, थानेसर, कुरुक्षेत्र में सुबह 10:00 बजे से किया जाएगा।',
   4, 'active'),
  ('Check ThanesarInfo.com regularly for updates, Direct Allotment/Draw results, and other notifications related to your booth/stall category.',
   'अपने बूथ/स्टॉल की श्रेणी से संबंधित अपडेट, Direct Allotment/Draw के परिणाम और अन्य सूचनाओं के लिए ThanesarInfo.com को नियमित रूप से चेक करते रहें।',
   5, 'active'),
  ('Result Declaration Date: 9 November 2026, at 11:00 AM for all categories except Brand Promotion & Corporate Category.',
   'परिणाम घोषित करने की तिथि: 9 नवंबर 2026, सुबह 11:00 बजे। यह Brand Promotion & Corporate Category को छोड़कर सभी श्रेणियों के लिए लागू है।',
   6, 'active');
