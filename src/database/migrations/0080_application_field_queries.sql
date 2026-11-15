-- Migration 0080: Field-level queries. An admin can flag one specific piece
-- of data an applicant entered (e.g. Father's Name, Address, a
-- category-specific field) as needing correction, and the applicant
-- corrects that exact field themselves from the Check Application Status
-- page. One row per query; previous_value/new_value capture what the
-- applicant changed so the reviewer can see it before re-checking.
--
-- field_key matches the keys already used by application_field_checks:
-- an applications-table column name ('father_name') or
-- 'dynamic:<category_field_definitions.id>' for category-specific fields.
-- Purely additive: no existing table or row is modified.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS application_field_queries (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id     BIGINT UNSIGNED NOT NULL,
  field_key          VARCHAR(64) NOT NULL,
  field_label        VARCHAR(191) NOT NULL,
  remarks            VARCHAR(512) NOT NULL,
  status             ENUM('open', 'responded', 'cancelled') NOT NULL DEFAULT 'open',
  previous_value     TEXT NULL,
  new_value          TEXT NULL,
  raised_by_user_id  BIGINT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at       DATETIME NULL,
  CONSTRAINT fk_afq_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_afq_raised_by FOREIGN KEY (raised_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_afq_application_status (application_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
