-- Migration 0083: Per-shop-type allotment amount.
--
-- categories.allotment_amount_paise is a single fixed figure per category.
-- Per explicit request, some categories (e.g. Wooden Craft & Carpets) need a
-- DIFFERENT allotment amount for a Single booth/stall vs. a Double
-- booth/stall. Rather than replace the existing column (used across ~30
-- files: payment order creation, allotment letters, declare-result, status
-- pages, draw service), this adds two optional override columns that only
-- take effect when actually configured — see
-- src/lib/applications/category-amount.ts's resolveAllotmentAmountPaise(),
-- which every call site now goes through instead of reading
-- allotment_amount_paise directly. A category that never sets these two new
-- columns behaves byte-for-byte as before (falls through to the existing
-- single allotment_amount_paise).

ALTER TABLE categories
  ADD COLUMN allotment_amount_single_paise INT UNSIGNED NULL AFTER allotment_amount_paise,
  ADD COLUMN allotment_amount_double_paise INT UNSIGNED NULL AFTER allotment_amount_single_paise;
