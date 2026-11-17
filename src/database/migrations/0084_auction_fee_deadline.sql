-- Migration 0084: Auction Participation Fee deadline
--
-- categories.auction_participation_fee_paise (migration 0075) had no
-- matching deadline — unlike the normal allotment flow's
-- allotment_payment_deadline_at, an auction participation fee payment link
-- never expired. Added per explicit request (2026-11-17) so admins can set
-- a due date for the Auction Participation Fee, same pattern as the
-- existing allotment deadline.
SET NAMES utf8mb4;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS auction_participation_fee_deadline_at DATETIME NULL AFTER auction_participation_fee_paise;
