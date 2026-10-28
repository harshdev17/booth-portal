-- Migration 0068: Adds a free-text "Important Dates & Deadlines" block per
-- category (English/Hindi), admin-editable from /admin/settings/general.
-- Separate from the existing structured date columns
-- (application_opens_at/closes_at, auction_date, allotment_payment_deadline_at)
-- because the full set of deadlines the business supplies per category
-- varies a lot — some categories have an auction fee window AND a separate
-- allotment fee window, others have neither, others just one allotment fee
-- deadline — a handful of fixed date columns can't cleanly cover every
-- combination, and adding a new column per newly-discovered deadline type is
-- not sustainable. A flexible text block (admin types/pastes the exact
-- bullet list) covers any combination without further schema changes, same
-- reasoning as allotment_amount_note for the "Allotment Amount" figure.
-- TEXT (not VARCHAR(191)) — see migration 0066's note on the same mistake
-- being made and fixed for allotment_amount_note.
ALTER TABLE categories
  ADD COLUMN important_dates_note    TEXT NULL AFTER allotment_amount_note_hi,
  ADD COLUMN important_dates_note_hi TEXT NULL AFTER important_dates_note;
