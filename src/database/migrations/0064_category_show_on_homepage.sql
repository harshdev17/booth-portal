-- Migration 0064: Decouple "open for applications" from "shown as a card
-- on the homepage" — previously the same `status = 'open'` flag drove
-- both listOpenCategories() (homepage grid) and the apply-page's
-- not-found check, so there was no way to let a category accept
-- applications via its direct URL without it also appearing as a
-- homepage card.
--
-- khadi-other-reserved ("Reserved Categories (Khadi, etc.)") is set to 0
-- per explicit request: it should stay reachable at
-- /apply/khadi-other-reserved and visible in admin, but never show up in
-- the homepage category grid (it never had its own CategoryCard by
-- design — see the comment in category-guidelines.ts — it previously had
-- a separate, now-hidden informational display, ReservedCategoriesSection).
ALTER TABLE categories
  ADD COLUMN show_on_homepage TINYINT(1) NOT NULL DEFAULT 1 AFTER status;

UPDATE categories SET show_on_homepage = 0 WHERE slug = 'khadi-other-reserved';
