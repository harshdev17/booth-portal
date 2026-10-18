-- Migration 0054: Add mandatory applicant details, payment amount and application link to direct_allotments
ALTER TABLE direct_allotments
  ADD COLUMN father_name VARCHAR(191) NULL AFTER contact_person,
  ADD COLUMN aadhaar_number VARCHAR(12) NULL AFTER father_name,
  ADD COLUMN address TEXT NULL AFTER aadhaar_number,
  ADD COLUMN email VARCHAR(191) NULL AFTER mobile_number,
  ADD COLUMN work_purpose TEXT NULL AFTER email,
  ADD COLUMN payment_amount_paise INT UNSIGNED NOT NULL DEFAULT 0 AFTER work_purpose,
  ADD COLUMN payment_status ENUM('not_required', 'pending', 'paid') NOT NULL DEFAULT 'not_required' AFTER payment_amount_paise,
  ADD COLUMN application_id BIGINT UNSIGNED NULL AFTER payment_status,
  ADD COLUMN application_number VARCHAR(32) NULL AFTER application_id,
  ADD CONSTRAINT fk_direct_allotments_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL;
