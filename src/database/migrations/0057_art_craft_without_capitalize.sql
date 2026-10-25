-- Migration 0057: Capitalize "Without" in the Art and Craft category name.
-- "Art and Craft (without card holder)" was set directly against the
-- database (no tracked migration) sometime after 0044_art_craft_category_
-- content.sql's "Art & Craft" rename; the lowercase "without" in the
-- bracketed qualifier was reported live and should read "Without".
UPDATE categories SET
  name = 'Art and Craft (Without card holder)'
WHERE slug = 'special-art-craft';
