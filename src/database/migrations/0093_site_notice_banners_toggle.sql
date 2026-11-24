-- Migration 0093: On/off switch for each shared notice banner
-- (PaymentPendingNotice, LetterAvailableNotice), independent of its text
-- (migration 0092) — per explicit request (2026-11-25): "remove ya add kaise
-- hoga" after seeing the text-only editor. One switch per banner, applying
-- to all three surfaces that show it (Corrigendum popup, /status, Allotment
-- Letter page) — not per-page, per explicit confirmation.
SET NAMES utf8mb4;

ALTER TABLE site_notice_banners
  ADD COLUMN payment_pending_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER payment_pending_text_hi,
  ADD COLUMN letter_available_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER letter_available_text_hi;
