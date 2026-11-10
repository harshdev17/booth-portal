-- Migration 0077: Auction Payment Flow
--
-- Categories with selection_method = 'auction' (currently only "Refreshment
-- and Ice Cream Booth/Stall") don't follow the normal draw → allotment-fee
-- → allotted flow. Instead, per explicit request (2026-11-10):
--   1. Draw runs → winners are "Selected for Auction", NOT allotted a stall
--      yet, and are sent an Auction Participation Fee payment request
--      (not the normal allotment-fee notification).
--   2. Applicant pays the participation fee -> "Auction Fee Paid".
--   3. [Offline] KDB holds a physical auction. Winners get a specific final
--      amount that varies per person.
--   4. Admin bulk-uploads a CSV (Application Number, Stall Number, Final
--      Auction Amount) for everyone who won at the physical auction ->
--      "Auction Won — Payment Pending", stall reserved for them, and an
--      immediate Final Auction Payment notification with their specific
--      amount.
--   5. Applicant pays the final amount -> reuses the EXISTING 'allotted'
--      status (confirmed by reading src/lib/allotment/allotment-letter-pdf.ts:
--      the Allotment Letter is gated purely on shop_units.allotted_to_application_id
--      / an active direct_allotments row being present — NOT on any specific
--      status value — so no new "won, fully paid" status is needed; setting
--      status='allotted' here is consistent with every other allotment path).
--
-- 1. applications.status gains 3 new values for the intermediate auction
--    states. Full ENUM list carried forward from migration 0052 (the last
--    migration that modified this column).
ALTER TABLE applications
  MODIFY COLUMN status ENUM(
    'draft', 'payment_pending', 'payment_failed', 'payment_success',
    'under_review', 'query_raised', 'approved', 'rejected', 'selected', 'not_selected',
    'payment_required', 'allotted', 'cancelled', 're_allotted',
    'selected_for_auction', 'auction_fee_paid', 'auction_won'
  ) NOT NULL DEFAULT 'draft';

-- 2. categories.auction_participation_fee_paise — admin-configurable
--    participation fee for an 'auction' selection_method category (never
--    hardcoded in application code, per CLAUDE.md §5). NULL by default:
--    an admin MUST set this before running a draw for an auction category,
--    or the draw will refuse to proceed (enforced in draw-service.ts, not
--    at the DB level, since a NULL/zero fee is a valid future configuration
--    for a free-entry auction category and shouldn't be blocked by schema).
--    Same INT UNSIGNED paise convention as categories.fee_paise /
--    allotment_amount_paise (migrations 0003, 0013).
ALTER TABLE categories
  ADD COLUMN auction_participation_fee_paise INT UNSIGNED NULL AFTER allotment_payment_deadline_at;

-- 3. payments.purpose gains 'auction_fee' (participation fee) and
--    'auction_final' (the Excel-supplied, per-person final auction amount).
--    Two distinct purposes (not one reused) because both can be owed by the
--    same application at different points in the flow, and
--    payments.purpose has a UNIQUE(application_id, purpose) constraint — a
--    single applicant needs one row for each.
ALTER TABLE payments
  MODIFY COLUMN purpose ENUM('registration', 'pay_now', 'auction_fee', 'auction_final') NOT NULL DEFAULT 'registration';
