-- Allotment letters are no longer available to applicants the instant their
-- allotment payment succeeds. An admin must explicitly "release" the letter
-- (verification step) before the applicant-facing download route will serve
-- it. NULL = not yet released.
ALTER TABLE applications
  ADD COLUMN allotment_letter_released_at DATETIME NULL AFTER status;
