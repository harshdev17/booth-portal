-- Migration 0005: Fee breakdown (base + GST) for categories.
--
-- Previously `categories.fee_paise` stored only an opaque total, which meant
-- the UI could never show "₹118 (₹100 + 18% GST)" — it could only show the
-- total or nothing. Per .ai/PAYMENT.md, the approved registration fee is
-- ₹100 base + 18% GST = ₹118, and that breakdown must be configurable, not
-- hardcoded into the frontend. This migration is additive only: fee_paise
-- is kept (now computed from the breakdown when the breakdown is set, or
-- read directly if only a flat total is configured for a category that has
-- no GST breakdown), so no existing row or query breaks.

SET NAMES utf8mb4;

ALTER TABLE categories
  ADD COLUMN fee_base_paise INT UNSIGNED NULL AFTER fee_paise,
  ADD COLUMN gst_percent DECIMAL(5,2) UNSIGNED NULL AFTER fee_base_paise;

-- category_shop_options fees (e.g. Single/Double Shop) are separate,
-- category-specific amounts (not the registration fee) and are left as a
-- flat fee_paise per .ai/BUSINESS_RULES.md's distinction between
-- application fee and other payment concepts (EMD/auction/allotment) — no
-- change needed there.
