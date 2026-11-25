-- Migration 0094: Admin-generated "apply anyway" links — per explicit
-- request (2026-11-25): "band form ka link kisi ko share kare to vo fill
-- kar paaye". A category can be closed to the public (window passed, or not
-- yet open) while an admin still wants one specific applicant to be able to
-- submit — this is a per-recipient, token-gated bypass, not a public
-- reopening of the category.
--
-- Only a hash of the token is ever stored (same principle as
-- access_token_hash on applications — see access-token.ts), so a database
-- leak alone never grants anyone the ability to use a link that wasn't
-- already handed to them.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS application_bypass_links (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token_hash      CHAR(64) NOT NULL,
  category_id     BIGINT UNSIGNED NOT NULL,
  recipient_label VARCHAR(255) NULL COMMENT 'Free-text note on who this was generated for (name/mobile) — not enforced, just shown to the admin for their own tracking.',
  max_uses        INT UNSIGNED NOT NULL DEFAULT 1,
  use_count       INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at      DATETIME NULL,
  revoked_at      DATETIME NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at    DATETIME NULL,
  UNIQUE KEY uq_application_bypass_links_token_hash (token_hash),
  KEY idx_application_bypass_links_category_id (category_id),
  CONSTRAINT fk_application_bypass_links_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  CONSTRAINT fk_application_bypass_links_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
