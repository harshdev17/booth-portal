-- Migration 0015: fix otp_challenges.purpose, which was left as
-- ENUM('applicant_mobile_verification') only (migration 0008) even after
-- the code started using a second value, 'status_lookup' (for the Check
-- Application Status page's OTP flow). Because this database's sql_mode
-- does not include STRICT_TRANS_TABLES, MySQL/MariaDB silently stores an
-- out-of-range ENUM value as an empty string instead of erroring — so every
-- 'status_lookup' OTP challenge has actually been saved with purpose=''
-- this whole time, not 'status_lookup'. Widening the ENUM now (adding
-- 'status_lookup' and the new 'print_application', used by the Print
-- Application feature) and backfilling the historical '' rows back to what
-- they should have been.
ALTER TABLE otp_challenges
  MODIFY COLUMN purpose ENUM('applicant_mobile_verification', 'status_lookup', 'print_application')
    NOT NULL DEFAULT 'applicant_mobile_verification';

UPDATE otp_challenges SET purpose = 'status_lookup' WHERE purpose = '';
