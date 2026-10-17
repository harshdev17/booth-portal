-- Migration 0049: Update Refreshment Stall extra declaration (Bilingual)
-- and update Art & Craft allotment amount to ₹50,000 (including GST).

SET NAMES utf8mb4;

-- 1. Refreshment Stall Extra Declaration
UPDATE categories
SET extra_declaration = 'I will sell only packaged food items. I understand that if found selling any products other than this, appropriate action will be taken by the Kurukshetra Development Board (KDB) and my booth/stall will be cancelled, and I will not make any claim for this.',
    extra_declaration_hi = 'मैं केवल पैकेज्ड (पैक की हुई) खाद्य सामग्री ही बेचूँगा/बेचूँगी। मैं समझता/समझती हूँ कि इससे अलग प्रोडक्ट बेचते पाए जाने पर कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा उचित कार्रवाई की जाएगी और मेरा बूथ/स्टॉल रद्द कर दिया जाएगा। और इसके लिए मैं कोई क्लेम नहीं करूँगा/करुँगी।'
WHERE slug = 'refreshment-stalls';

-- 2. Art & Craft Allotment Amount (₹50,000 = 5000000 paise)
UPDATE categories
SET allotment_amount_paise = 5000000,
    allotment_amount_note = NULL,
    allotment_amount_note_hi = NULL
WHERE slug = 'special-art-craft';
