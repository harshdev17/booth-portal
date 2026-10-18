ALTER TABLE categories
  ADD COLUMN allotment_payment_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER allotment_amount_note_hi,
  ADD COLUMN allotment_payment_deadline_at DATETIME NULL AFTER allotment_payment_enabled;
