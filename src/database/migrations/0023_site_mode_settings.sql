-- Migration 0023: admin-controlled "Coming Soon" switch.
--
-- Single-row table (id is always 1), same convention as
-- site_contact_settings: one site, one setting. Replaces the
-- COMING_SOON_MODE environment variable, so the gate can be turned on/off
-- from /admin/settings/coming-soon without editing env or restarting.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS site_mode_settings (
  id                  BIGINT UNSIGNED PRIMARY KEY,
  coming_soon_enabled TINYINT(1) NOT NULL DEFAULT 0,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_site_mode_settings_user FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO site_mode_settings (id, coming_soon_enabled) VALUES (1, 0)
ON DUPLICATE KEY UPDATE id = id;
