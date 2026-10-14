-- Migration 0030: optional category-specific declaration, shown as an extra
-- required tick box next to the two general declarations on the form.
--  * Refreshment: sell only packaged food, or the stall is cancelled.
--  * SHG: sell only products made by the group, or the stall may be cancelled.
-- (The SHG notice added in 0026 is replaced by this declaration.)

SET NAMES utf8mb4;

ALTER TABLE categories
  ADD COLUMN extra_declaration    VARCHAR(512) NULL,
  ADD COLUMN extra_declaration_hi VARCHAR(512) NULL;

UPDATE categories
SET extra_declaration = 'I will sell only packaged food items. I understand that if I am found selling cooked food, KDB will take appropriate action and my stall/booth will be cancelled.',
    extra_declaration_hi = 'मैं केवल पैकेज्ड (पैक की हुई) खाद्य सामग्री ही बेचूँगा/बेचूँगी। मैं समझता/समझती हूँ कि पका हुआ भोजन बेचते पाए जाने पर कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा उचित कार्रवाई की जाएगी और मेरा स्टॉल/बूथ रद्द कर दिया जाएगा।'
WHERE slug = 'refreshment-stalls';

UPDATE categories
SET extra_declaration = 'I declare that I will sell only products made by me (my group). I understand that if I am found selling any other product, my stall may be cancelled.',
    extra_declaration_hi = 'मैं स्वीकार करता/करती हूँ कि मैं केवल अपने (अपने समूह द्वारा) बनाए गए उत्पाद ही बेचूँगा/बेचूँगी। मैं समझता/समझती हूँ कि किसी अन्य उत्पाद को बेचते पाए जाने पर मेरा स्टॉल रद्द किया जा सकता है।',
    form_notice = NULL,
    form_notice_hi = NULL
WHERE slug = 'self-help-groups';
