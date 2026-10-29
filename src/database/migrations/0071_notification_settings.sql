-- Migration 0071: Admin-togglable WhatsApp notifications switch.
-- Single-row table (id is always 1) — same established convention as
-- site_contact_settings (migration 0022): one purpose-built table per
-- setting rather than a generic key-value store.
--
-- When whatsapp_enabled = 0, sendNotification() (src/lib/notifications/
-- service.ts) skips the AiSensy call entirely — every notification
-- (including OTP) is delivered by email only, with no code/env change
-- needed to flip back. Email itself was always sent in parallel
-- regardless of this flag; this only gates the WhatsApp side.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS notification_settings (
  id                  BIGINT UNSIGNED PRIMARY KEY,
  whatsapp_enabled    TINYINT(1) NOT NULL DEFAULT 1,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_settings_user FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO notification_settings (id, whatsapp_enabled)
VALUES (1, 1)
ON DUPLICATE KEY UPDATE id = id;
