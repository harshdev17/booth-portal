-- Migration 0010: Admin-configurable homepage notices, replacing the
-- hardcoded bilingual strings previously in HeaderMarquee.tsx. This is the
-- "Notice" concept already documented but not implemented in
-- .ai/DATABASE.md Section 5 — see .ai/DECISIONS.md for the reason it was
-- deferred until now, and .ai/NOTIFICATIONS.md's ImportantNoticesWidget
-- (also previously a static honest-empty-state placeholder for the same
-- reason).

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS notices (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  text          VARCHAR(512) NOT NULL,
  text_hi       VARCHAR(512) NULL,
  display_order INT UNSIGNED NOT NULL DEFAULT 0,
  status        ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_notices_status_order (status, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
