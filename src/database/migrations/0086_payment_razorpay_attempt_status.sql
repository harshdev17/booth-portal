-- Stores the exact raw status Razorpay's own API returned for a payment's
-- latest attempt (created / authorized / captured / failed — see
-- https://razorpay.com/docs/api/payments/entity/), separate from our own
-- derived payments.status (not_initiated/pending/success/failed/refunded).
-- Populated by the single and bulk "Reconcile with Razorpay" actions so an
-- admin can tell a genuinely-no-attempt-made order apart from one where
-- Razorpay shows the payment still in progress (authorized, awaiting
-- capture) rather than captured or failed outright.
ALTER TABLE payments
  ADD COLUMN razorpay_attempt_status VARCHAR(32) NULL AFTER status,
  ADD COLUMN razorpay_attempt_checked_at DATETIME NULL AFTER razorpay_attempt_status;
