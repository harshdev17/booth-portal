-- Set by Reconcile (single or bulk, src/app/server/payment-*-reconcile-actions.ts)
-- when it finds MORE THAN ONE of a payment's past Razorpay orders genuinely
-- captured — a real double payment (applicant retried "Pay" and both
-- attempts went through), not just a retry where only the latest succeeded.
-- Stored so the Multiple Payment Attempts admin page can show this without a
-- live Razorpay call on every page load.
ALTER TABLE payments
  ADD COLUMN possible_double_payment TINYINT(1) NOT NULL DEFAULT 0 AFTER razorpay_attempt_checked_at,
  ADD COLUMN double_payment_order_ids TEXT NULL AFTER possible_double_payment;
