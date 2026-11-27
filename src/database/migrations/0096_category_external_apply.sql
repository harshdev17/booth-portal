-- "External apply" categories (2026-11-27): a category whose "Apply Now"
-- button must link straight to an admin-configured external URL (a Google
-- Form) instead of this app's own multi-step /apply/[slug] form, plus a
-- "View Details" button opening an admin-uploaded PDF — used for
-- "Application For Saras Jyotisar" and "Application For Mela Ground".
-- A category is external simply when external_apply_url IS NOT NULL — no
-- separate enum needed, same spirit as show_on_homepage (migration 0064).
--
-- total_booths is a plain admin-entered number, deliberately NOT sourced
-- from shop_units (unlike availableShopsCount elsewhere) — these categories
-- have no real shop_units rows, since applicants never get an actual booth
-- allotted through this app for them (allotment happens outside, via the
-- Google Form's own process).
--
-- last_date is a plain display date shown on the card, independent of
-- application_opens_at/application_closes_at — those columns gate this
-- app's own apply flow, which an external category bypasses entirely, so
-- reusing them would be semantically wrong (CLAUDE.md §5: never conflate
-- two different configurable business values).
ALTER TABLE categories
  ADD COLUMN external_apply_url VARCHAR(500) NULL AFTER selection_method,
  ADD COLUMN pdf_path VARCHAR(255) NULL AFTER external_apply_url,
  ADD COLUMN pdf_original_filename VARCHAR(255) NULL AFTER pdf_path,
  ADD COLUMN total_booths INT UNSIGNED NULL AFTER pdf_original_filename,
  ADD COLUMN last_date DATE NULL AFTER total_booths;
