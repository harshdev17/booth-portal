-- Migration 0069: "National Awardees" category is for National award winners
-- only, not State award winners — per explicit instruction, remove the
-- stray "and state" wording that only existed in the English description
-- (the Hindi description and all document labels already said "National"
-- only).
UPDATE categories SET
  description = 'Special booths/stalls for national award-winning artisans. Booth/stall will be allotted directly if the applicant is within the available booth/stall limit. If the number of eligible applicants exceeds the available booths/stalls, allotment will be conducted through a Draw.'
WHERE slug = 'national-awardees';
