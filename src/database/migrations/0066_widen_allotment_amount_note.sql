-- Migration 0066: widen allotment_amount_note/_hi from VARCHAR(191) to TEXT.
-- Reported live: a multi-line bullet-formatted note (Brand Promotion's
-- Small/Large Booth breakdown + prime-location note, migration 0065's
-- follow-up content) was silently truncated mid-word at the 191-character
-- limit — MySQL does not error on VARCHAR overflow by default, it just cuts
-- the value. TEXT removes this cap entirely for a field that is purely
-- descriptive prose, never used in a WHERE/JOIN/index.
ALTER TABLE categories
  MODIFY COLUMN allotment_amount_note TEXT NULL,
  MODIFY COLUMN allotment_amount_note_hi TEXT NULL;
