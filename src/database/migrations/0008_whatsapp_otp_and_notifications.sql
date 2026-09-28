-- Migration 0008: WhatsApp OTP verification (via AiSensy) and a notification
-- send-log, per .ai/NOTIFICATIONS.md and the decision to use AiSensy as the
-- WhatsApp Business API provider (see .ai/DECISIONS.md).
--
-- Design notes:
-- - otp_challenges.code_hash stores only a SHA-256 hash of the 6-digit code,
--   never the raw code — same principle as applications.access_token_hash
--   and password storage. A database leak alone does not reveal any code.
-- - One row per OTP request (not overwritten in place) so rate-limiting and
--   audit ("how many OTPs did this number request today") can be computed
--   directly from history, and so a still-valid earlier code cannot be
--   confused with a newer one.
-- - notification_log is intentionally provider-agnostic (channel + provider
--   columns, not "aisensy_log") so a future provider swap (see
--   NotificationService abstraction) does not require a schema change.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS otp_challenges (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purpose           ENUM('applicant_mobile_verification') NOT NULL DEFAULT 'applicant_mobile_verification',
  mobile_number     VARCHAR(15) NOT NULL,
  application_id    BIGINT UNSIGNED NULL,
  code_hash         CHAR(64) NOT NULL, -- SHA-256 hex digest of the 6-digit code
  attempt_count     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts      TINYINT UNSIGNED NOT NULL DEFAULT 5,
  expires_at        DATETIME NOT NULL,
  verified_at       DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address        VARCHAR(45) NULL,
  CONSTRAINT fk_otp_challenges_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
  INDEX idx_otp_challenges_mobile (mobile_number, created_at),
  INDEX idx_otp_challenges_application (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notification_log (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  channel           ENUM('whatsapp', 'sms', 'email') NOT NULL,
  provider          VARCHAR(50) NOT NULL, -- e.g. 'aisensy'
  category          ENUM(
                      'otp', 'application_confirmation', 'payment_confirmation',
                      'status_update', 'document_query', 'pay_now_activation', 'reminder'
                    ) NOT NULL,
  application_id    BIGINT UNSIGNED NULL,
  destination       VARCHAR(20) NOT NULL, -- mobile number with country code
  campaign_name     VARCHAR(191) NULL, -- AiSensy campaign/template name used
  status            ENUM('sent', 'failed') NOT NULL,
  error_message     VARCHAR(512) NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_log_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
  INDEX idx_notification_log_application (application_id),
  INDEX idx_notification_log_category (category, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
