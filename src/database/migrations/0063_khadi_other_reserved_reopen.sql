-- Migration 0063: Re-open the "Reserved Categories (Khadi, etc.)" category
-- for applications (reported live: /apply/khadi-other-reserved returned
-- 404 — src/app/(public)/apply/[category]/page.tsx calls notFound() when
-- categories.status is 'draft' or 'archived'). This category's status was
-- 'open' in its original seed (migration 0007) and was never changed by
-- any tracked migration since, so it must have been flipped directly
-- against the live DB at some point — most likely when the homepage
-- "Reserved Categories" display section was hidden (PublicHomeClient.tsx),
-- which only needed that component commented out and did NOT require
-- changing this category's own status.
UPDATE categories SET
  status = 'open'
WHERE slug = 'khadi-other-reserved';
