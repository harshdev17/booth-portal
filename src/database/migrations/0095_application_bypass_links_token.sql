-- Migration 0095: Store the plaintext token alongside its hash, and allow
-- editing a link's expiry after creation — per explicit request
-- (2026-11-25): admin wants a "Copy" button on each row in the Generated
-- Links list (not just once at creation time) and a way to change an active
-- link's expiry. This trades a small amount of security (an admin-only page
-- now shows usable tokens in plaintext, same exposure as anyone with
-- config:manage access already has via the Generate Link flow) for that
-- convenience — explicitly confirmed with the user before implementing.
SET NAMES utf8mb4;

ALTER TABLE application_bypass_links
  ADD COLUMN token VARCHAR(64) NULL AFTER token_hash;
