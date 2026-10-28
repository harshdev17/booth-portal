-- Migration 0065: Brand Promotion & Corporate — restore fixed Small/Large
-- Booth allotment amounts and add a mandatory sponsorship requirement with
-- direct KDB (Board) verification/finalization, per explicit business-
-- supplied content. Supersedes migration 0042's "agency appointed by KDB,
-- no fixed rate" model — allotment_amount_paise stays NULL (two named
-- tiers, not one fixed figure), only the note text and description change.
UPDATE categories SET
  description = 'Commercial and promotional booths/stalls will be available at prime locations for promoting your brand, company, or organization. Booth/stall allotment is through the KDB; the KDB will contact you directly after reviewing the proposed application. Maximum sponsorships given by the companies etc. will be given priority.',
  description_hi = 'ब्रांड, कंपनी या संगठन के प्रचार हेतु प्रमुख स्थानों पर व्यावसायिक एवं प्रचार बूथ/स्टॉल उपलब्ध होंगे। बूथ/स्टॉल का आबंटन KDB के माध्यम से होगा; प्रस्तावित आवेदन की जाँच के बाद KDB आवेदक से सीधे संपर्क करेगा। कंपनियों आदि द्वारा दिए गए अधिकतम प्रायोजन को प्राथमिकता दी जाएगी।',
  allotment_amount_note = 'Small Booth: Rs. 1,00,000 (1 Lakh) · Large Booth: Rs. 1,50,000 (1.5 Lakh)',
  allotment_amount_note_hi = 'छोटा बूथ: ₹1,00,000 (1 लाख) · बड़ा बूथ: ₹1,50,000 (1.5 लाख)'
WHERE slug = 'brand-promotions';

-- New required document: a financial & brand promotion sponsorship
-- proposal, submitted alongside the application per the new 3-step
-- Allotment Method (Proposal Submission -> Verification -> Finalization).
SET @cat_brand = (SELECT id FROM categories WHERE slug = 'brand-promotions' LIMIT 1);

INSERT INTO category_document_definitions (category_id, document_key, label, label_hi, is_required, display_order)
VALUES (@cat_brand, 'sponsorship_proposal', 'Financial & Brand Promotion Sponsorship Proposal', 'वित्तीय एवं ब्रांड प्रमोशन प्रायोजन प्रस्ताव', 1, 4)
ON DUPLICATE KEY UPDATE label = VALUES(label), label_hi = VALUES(label_hi), is_required = VALUES(is_required);
