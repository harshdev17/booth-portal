-- Migration 0075: Update "Important Dates & Deadlines" (important_dates_note
-- / _hi) for 9 categories with the extended schedule supplied 2026-11-07.
--
-- Group A (8 categories, extended Last Date to Apply + Result Declaration):
-- Social Organizations (Registered), Sweets/Bakers/Special Food Items,
-- SARAS (Self Help Groups), Artisan Card Holders, National Awardees,
-- Special Art and Craft (without card holder), Wooden Craft & Carpets
-- (Large Space), Brand Promotion & Corporate.
--
-- Group B (1 category, its own extended auction/payment schedule):
-- Refreshment and Ice Cream Booth/Stall.
SET NAMES utf8mb4;

UPDATE categories
SET important_dates_note = '• Application Start Date: 29 October 2026, at 10:00 AM
• Last Date to Apply Online: 7 November 2026, by 5:00 PM
• Extended Last Date to Apply Online: 10 November 2026, by 5:00 PM
• Result Declaration Date: 9 November 2026, at 11:00 AM
• Extended Result Declaration Date: 12 November 2026, at 11:00 AM
• Allotment Letter Download Period: The allotment letter can be downloaded after the result announced.',
    important_dates_note_hi = '• आवेदन प्रारंभ तिथि: 29 अक्टूबर 2026, सुबह 10:00 बजे
• ऑनलाइन आवेदन की अंतिम तिथि: 7 नवंबर 2026, शाम 5:00 बजे तक
• ऑनलाइन आवेदन करने की बढ़ाई गई अंतिम तिथि: 10 नवंबर 2026, शाम 5:00 बजे तक
• ऑनलाइन रिजल्ट जारी की तिथि: 9 नवंबर 2026, सुबह 11:00 बजे
• ऑनलाइन रिजल्ट जारी करने की बढ़ाई गई तिथि: 12 नवंबर 2026, सुबह 11:00 बजे
• आबंटन पत्र डाउनलोड अवधि: आबंटन पत्र बूथ/स्टॉल रिजल्ट जारी होने के बाद डाउनलोड किया जा सकता है।'
WHERE slug IN (
  'ngos-social-organizations',
  'sweets-special-items',
  'self-help-groups',
  'artisan-card-holders',
  'national-awardees',
  'special-art-craft',
  'wooden-craft-carpets',
  'brand-promotions'
);

UPDATE categories
SET important_dates_note = '• Application Start Date: 29 October 2026, at 10:00 AM
• Last Date to Apply Online: 7 November 2026, by 5:00 PM
• Extended Last Date to Apply Online: 10 November 2026, by 5:00 PM
• Result Declaration Date: 9 November 2026, at 11:00 AM
• Extended Result Declaration Date: 12 November 2026, at 11:00 AM
• Booth/Stall Auction Participation Fee Payment Start Date: 9 November 2026, at 12:00 PM (Noon)
• Extended Booth/Stall Auction Participation Fee Payment Start Date: 12 November 2026, at 12:00 PM (Noon)
• Last Date to Pay the Auction Participation Fee: 11 November 2026, by 11:00 PM
• Extended Last Date to Pay the Auction Participation Fee: 14 November 2026, by 11:00 PM
• Date of Auction: 13 November 2026, from 10:00 AM onwards
• Extended Date of Auction: 16 November 2026, from 10:00 AM onwards
• Auction Venue: Sri Krishna Museum, Near Panorama Science Centre, KDB Road, Thanesar, Kurukshetra.
• Booth/Stall Allotment Fee Payment Period: From 14 November 2026, at 11:00 AM, to 16 November 2026, at 11:59 PM
• Extended Booth/Stall Allotment Fee Payment Period: From 17 November 2026, at 11:00 AM, to 19 November 2026, at 11:59 PM
• Allotment Letter Download Start Date: The allotment letter can be downloaded after successful payment of the booth/stall allotment fee.',
    important_dates_note_hi = '• आवेदन प्रारंभ तिथि: 29 अक्टूबर 2026, सुबह 10:00 बजे
• ऑनलाइन आवेदन की अंतिम तिथि: 7 नवंबर 2026, शाम 5:00 बजे तक
• ऑनलाइन आवेदन करने की बढ़ाई गई अंतिम तिथि: 10 नवंबर 2026, शाम 5:00 बजे तक
• ऑनलाइन रिजल्ट जारी करने की तिथि: 9 नवंबर 2026, सुबह 11:00 बजे
• ऑनलाइन रिजल्ट जारी करने की बढ़ाई गई तिथि: 12 नवंबर 2026, सुबह 11:00 बजे
• बूथ/स्टॉल फिजिकल ऑक्शन भागीदारी शुल्क भुगतान प्रारंभ तिथि: 9 नवंबर 2026, दोपहर 12:00 बजे
• बूथ/स्टॉल फिजिकल ऑक्शन भागीदारी शुल्क भुगतान प्रारंभ की बढ़ाई गई तिथि: 12 नवंबर 2026, दोपहर 12:00 बजे
• फिजिकल ऑक्शन भागीदारी शुल्क भुगतान की अंतिम तिथि: 11 नवंबर 2026, रात 11:00 बजे तक
• फिजिकल ऑक्शन भागीदारी शुल्क भुगतान की बढ़ाई गई अंतिम तिथि: 14 नवंबर 2026, रात 11:00 बजे तक
• फिजिकल ऑक्शन की तिथि: 13 नवंबर 2026, सुबह 10:00 बजे से
• फिजिकल ऑक्शन की बढ़ाई गई तिथि: 16 नवंबर 2026, सुबह 10:00 बजे से
• फिजिकल ऑक्शन स्थल: श्री कृष्ण संग्रहालय, पैनोरमा साइंस सेंटर के पास, KDB रोड, थानेसर, कुरुक्षेत्र।
• बूथ/स्टॉल आबंटन शुल्क भुगतान अवधि: 14 नवंबर 2026, सुबह 11:00 बजे से 16 नवंबर 2026, रात 11:59 बजे तक
• बूथ/स्टॉल आबंटन शुल्क भुगतान की बढ़ाई गई अवधि: 17 नवंबर 2026, सुबह 11:00 बजे से 19 नवंबर 2026, रात 11:59 बजे तक
• आबंटन पत्र डाउनलोड प्रारंभ तिथि: 14 नवंबर 2026, सुबह 11:00 बजे से।
• आबंटन पत्र डाउनलोड की बढ़ाई गई प्रारंभ तिथि: आबंटन पत्र बूथ/स्टॉल आबंटन शुल्क के सफल भुगतान के बाद डाउनलोड किया जा सकता है।'
WHERE slug = 'refreshment-stalls';
