-- Refreshment & Food Booths/Stalls: card / key-facts content and the
-- application + auction dates supplied verbatim by the business.
-- Dates are stored as IST wall-clock values (as elsewhere in this table):
-- application closes 28 Oct 2026 23:59:59 IST, physical
-- auction 06 Nov 2026 10:00 IST.
UPDATE categories SET
  name_hi = 'जलपान एवं खाद्य बूथ/स्टॉल',
  description = 'Designated booths/stalls for food and beverages at Brahma Sarovar. These booths/stalls will be allotted by the KDB through auction.',
  description_hi = 'ब्रह्म सरोवर पर खाद्य एवं पेय पदार्थों के लिए निर्धारित बूथ/स्टॉल उपलब्ध होंगे। इन बूथ/स्टॉलों का आबंटन (केडीबी) द्वारा नीलामी के माध्यम से किया जाएगा।',
  allotment_amount_note = 'Participation Fee: ₹50,000/- + Base Bid: ₹2,00,000/- (Read the detailed guidelines for complete information.)',
  allotment_amount_note_hi = 'भागीदारी शुल्क: ₹50,000/- + बेस बिड: ₹2,00,000/- (पूरी जानकारी के लिए विस्तृत गाइडलाइन्स पढ़ें।)',
  application_closes_at = '2026-10-28 23:59:59',
  auction_date = '2026-11-06 10:00:00',
  auction_venue = 'Shri Krishna Museum, Near Panorama Science Centre, KDB Road, Thanesar, Kurukshetra',
  auction_venue_hi = 'श्री कृष्ण संग्रहालय, पैनोरमा साइंस सेंटर के पास, KDB रोड, थानेसर, कुरुक्षेत्र'
WHERE slug = 'refreshment-stalls';
