-- Migration 0075: Auction Payment Flow
--
-- Categories with selection_method = 'auction' (currently only "Refreshment
-- and Ice Cream Booth/Stall") don't follow the normal draw -> allotment-fee
-- -> allotted flow. Instead:
--   1. Draw runs -> winners are "Selected for Auction", NOT allotted a stall
--      yet, and are sent an Auction Participation Fee payment request.
--   2. Applicant pays the participation fee -> "Auction Fee Paid".
--   3. [Offline] KDB holds a physical auction. Winners get a specific final
--      amount that varies per person.
--   4. Admin bulk-uploads a CSV (Application Number, Stall Number, Final
--      Auction Amount) for everyone who won at the physical auction ->
--      "Auction Won", stall reserved for them, and an immediate Final
--      Auction Payment notification with their specific amount.
--   5. Applicant pays the final amount -> reuses the EXISTING 'allotted'
--      status (the Allotment Letter is gated purely on a stall being
--      assigned to the application, not on any specific status value, so no
--      new "won, fully paid" status is needed).
--
-- NOTE: an earlier attempt at this exact migration (also numbered in the
-- 0075-0077 range) may already have been applied to the live/UAT database
-- before the accompanying code was reverted after a production outage on
-- 2026-11-10 (see .ai/CHANGELOG.md) — its migration FILE no longer exists in
-- this repo, so this is a fresh file, written defensively (IF NOT EXISTS /
-- idempotent MODIFY) so it is safe to run whether or not that happened.
SET NAMES utf8mb4;

-- 1. applications.status gains 3 new values for the intermediate auction
--    states. MODIFY COLUMN with the full target ENUM list is naturally
--    idempotent — safe to re-run even if these values are already present.
ALTER TABLE applications
  MODIFY COLUMN status ENUM(
    'draft', 'payment_pending', 'payment_failed', 'payment_success',
    'under_review', 'query_raised', 'approved', 'rejected', 'selected', 'not_selected',
    'payment_required', 'allotted', 'cancelled', 're_allotted',
    'selected_for_auction', 'auction_fee_paid', 'auction_won'
  ) NOT NULL DEFAULT 'draft';

-- 2. categories.auction_participation_fee_paise - admin-configurable
--    participation fee for an 'auction' selection_method category (never
--    hardcoded in application code, per CLAUDE.md Section 5). NULL by
--    default: an admin MUST set this before running a draw for an auction
--    category, or the draw refuses to proceed (enforced in application
--    code, not at the DB level).
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS auction_participation_fee_paise INT UNSIGNED NULL AFTER allotment_payment_deadline_at;

-- 3. payments.purpose gains 'auction_fee' (participation fee) and
--    'auction_final' (the CSV-supplied, per-person final auction amount).
--    Two distinct purposes because both can be owed by the same
--    application at different points in the flow, and payments.purpose has
--    a UNIQUE(application_id, purpose) constraint.
ALTER TABLE payments
  MODIFY COLUMN purpose ENUM('registration', 'pay_now', 'auction_fee', 'auction_final') NOT NULL DEFAULT 'registration';
