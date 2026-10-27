-- Splits the previously single-purpose 'reserved' shop_units status into two
-- distinct meanings (per explicit request, 2026-10-28):
--   - 'reserved'                     : payment is pending on a real
--                                      application/direct-allotment record
--                                      (unchanged — already auto-converts to
--                                      'allotted' on successful payment, see
--                                      src/lib/payments/payment-records.ts).
--   - 'reserved_for_direct_allotment': admin has earmarked the stall for
--                                      direct allotment but has not yet
--                                      entered allottee details — a hold
--                                      flag only, no application/payment
--                                      record exists yet for it.
ALTER TABLE shop_units
  MODIFY COLUMN status ENUM('available', 'reserved', 'reserved_for_direct_allotment', 'allotted', 'cancelled', 'rejected')
    NOT NULL DEFAULT 'available';
