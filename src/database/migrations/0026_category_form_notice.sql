-- Migration 0026: optional per-category notice shown at the top of the
-- category-specific step of the application form (e.g. selling rules).
-- Config, not code, so wording can change without a deploy.

SET NAMES utf8mb4;

ALTER TABLE categories
  ADD COLUMN form_notice    VARCHAR(512) NULL,
  ADD COLUMN form_notice_hi VARCHAR(512) NULL;

UPDATE categories
SET form_notice = 'Sell only packaged food items; if cooked food is sold, the allotment will be cancelled. Sell only products made by your own group.',
    form_notice_hi = 'केवल पैकेज्ड खाद्य सामग्री ही बेचें; पका हुआ भोजन बेचने पर आवंटन रद्द कर दिया जाएगा। केवल अपने समूह द्वारा बनाए गए उत्पाद ही बेचें।'
WHERE slug = 'self-help-groups';
