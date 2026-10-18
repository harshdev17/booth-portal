-- Migration 0052: make the existing "Approved for Draw" workflow state real.
-- The admin UI and draw engine already distinguish this state from a candidate
-- that has actually been selected/allotted by a completed draw.
ALTER TABLE applications
  MODIFY COLUMN status ENUM(
    'draft', 'payment_pending', 'payment_failed', 'payment_success',
    'under_review', 'query_raised', 'approved', 'rejected', 'selected', 'not_selected',
    'payment_required', 'allotted', 'cancelled', 're_allotted'
  ) NOT NULL DEFAULT 'draft';
