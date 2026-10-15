-- Event-wide application window, used by the homepage hero's date-range
-- text, updated to match the business-supplied schedule: applications run
-- 14 Oct 2026 - 28 Oct 2026, 11:59 PM IST.
UPDATE events SET
  starts_on = '2026-10-14 00:00:00',
  ends_on = '2026-10-28 23:59:59'
WHERE slug = 'gita-mahotsav-2026';
