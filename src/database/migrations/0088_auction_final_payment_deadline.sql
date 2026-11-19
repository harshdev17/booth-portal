-- Deadline for an auction winner's FINAL allotment payment (after they've
-- already paid the Auction Participation Fee and won at the physical
-- auction) — distinct from auction_participation_fee_deadline_at (migration
-- 0075/0084), which is the deadline for the smaller up-front fee paid just
-- to take part in the auction. Admin-configured per auction category,
-- mirrors allotment_payment_deadline_at's role for the draw/manual flow.
ALTER TABLE categories
  ADD COLUMN auction_final_payment_deadline_at DATETIME NULL AFTER auction_participation_fee_deadline_at;
