-- Migration 0067: Rename "Art and Craft (Without card holder)" to "Special Art
-- and Craft (Without card holder)" per explicit instruction — matches the
-- guidelines-page title/titleHi update in category-guidelines.ts.
UPDATE categories SET
  name = 'Special Art and Craft (Without card holder)',
  name_hi = 'विशेष आर्ट एंड क्राफ्ट (बिना कार्ड के)'
WHERE slug = 'special-art-craft';
