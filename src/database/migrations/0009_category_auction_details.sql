-- Migration 0009: Auction date and venue per category, so the application
-- form's "Before You Start" instructions can show real, admin-configured
-- auction/bidding details instead of hardcoded text — per the requirement
-- that no configurable business value (dates, venues) be hardcoded into
-- application code (see CLAUDE.md Section 5, .ai/CONFIGURATION.md).
--
-- Nullable and additive only: a category with no auction_date/auction_venue
-- set simply omits that instruction point on the public form, rather than
-- showing an empty/placeholder value.

SET NAMES utf8mb4;

ALTER TABLE categories
  ADD COLUMN auction_date DATETIME NULL AFTER application_closes_at,
  ADD COLUMN auction_venue VARCHAR(255) NULL AFTER auction_date,
  ADD COLUMN auction_venue_hi VARCHAR(255) NULL AFTER auction_venue;
