-- Migration 0091: Make the Corrigendum popup's own heading/subheading/
-- footer text admin-editable, not just its Particular/Previous/Revised
-- table rows (migration 0090) — per explicit request (2026-11-25):
-- "pop mai jo bhi aara hai vo sab admin se manage ho, abhi only table hi
-- manage ho rahi hai bas". Scoped to text that is unique to this popup only
-- (the shared PaymentPendingNotice/LetterAvailableNotice banners also used
-- on /status and the allotment-letter page are explicitly out of scope,
-- per follow-up confirmation).
SET NAMES utf8mb4;

ALTER TABLE corrigendum_notice_settings
  ADD COLUMN heading VARCHAR(255) NOT NULL DEFAULT 'Important Notice' AFTER enabled,
  ADD COLUMN heading_hi VARCHAR(255) NOT NULL DEFAULT 'महत्वपूर्ण सूचना' AFTER heading,
  ADD COLUMN subheading VARCHAR(255) NOT NULL DEFAULT 'Revised Schedule' AFTER heading_hi,
  ADD COLUMN subheading_hi VARCHAR(255) NOT NULL DEFAULT 'संशोधित कार्यक्रम' AFTER subheading,
  ADD COLUMN footer_text VARCHAR(1000) NOT NULL DEFAULT 'Applicants who have already submitted their applications successfully need not apply again.' AFTER subheading_hi,
  ADD COLUMN footer_text_hi VARCHAR(1000) NOT NULL DEFAULT 'जिन आवेदकों ने पहले ही अपना आवेदन सफलतापूर्वक जमा कर दिया है, उन्हें दोबारा आवेदन करने की जरूरत नहीं है।' AFTER footer_text;
