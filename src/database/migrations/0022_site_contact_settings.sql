-- Migration 0022: Site-wide contact settings (phone, email, WhatsApp
-- number, address, social links) — admin-configurable, replacing the
-- hardcoded placeholder values duplicated independently across
-- PublicHeader.tsx, PublicFooter.tsx, FloatingContactButtons.tsx, and
-- ContactBannerSection.tsx (each of those files' own comments already
-- flagged this duplication as a known gap — see .ai/OPEN_QUESTIONS.md).
--
-- Single-row table (id is always 1) — there is one site, one set of
-- contact details, not a list; this avoids a generic key-value settings
-- table for what is a small, fixed, well-known set of fields, matching
-- this project's established convention of a purpose-built table per
-- setting rather than a generic KV store (see notices, categories).

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS site_contact_settings (
  id                  BIGINT UNSIGNED PRIMARY KEY,
  phone               VARCHAR(20) NULL,
  email               VARCHAR(191) NULL,
  whatsapp_number     VARCHAR(20) NULL,
  address             VARCHAR(255) NULL,
  address_hi          VARCHAR(255) NULL,
  facebook_url        VARCHAR(255) NULL,
  instagram_url       VARCHAR(255) NULL,
  youtube_url         VARCHAR(255) NULL,
  twitter_url         VARCHAR(255) NULL,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_site_contact_settings_user FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed the single row (id=1, the only id application code ever reads/writes)
-- with the values currently hardcoded across the public site, so behaviour
-- is unchanged until an admin edits them from /admin/settings/contact.
INSERT INTO site_contact_settings (id, phone, email, whatsapp_number, address)
VALUES (1, '+919876543210', 'helpdesk@stallportal.in', '919876543210', 'Kurukshetra, Haryana – 136118')
ON DUPLICATE KEY UPDATE id = id;
