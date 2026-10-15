-- Social Organizations: shorter display names (EN + HI) as requested.
UPDATE categories SET
  name = 'Social Organizations (Registered)',
  name_hi = 'सामाजिक संगठन (पंजीकृत)'
WHERE slug = 'ngos-social-organizations';
