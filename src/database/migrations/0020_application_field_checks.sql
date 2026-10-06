-- Migration 0020: Per-field "data verified correct" checkmarks on the admin
-- Application Detail page.
--
-- One row per (application, field) that an admin has ticked as correct —
-- existence of a row IS the "checked" state (no boolean column to drift out
-- of sync), so unchecking a box deletes its row rather than flipping a flag.
-- field_key is a fixed string for the applicant's own columns (e.g.
-- 'representative_name', 'aadhaar_number') or 'dynamic:<field_definition_id>'
-- for a category-specific field from application_field_values — see
-- src/lib/pdf/templates.ts / the Application Detail page for the exact set.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS application_field_checks (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id      BIGINT UNSIGNED NOT NULL,
  field_key           VARCHAR(100) NOT NULL,
  checked_by_user_id  BIGINT UNSIGNED NOT NULL,
  checked_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_application_field_checks_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_application_field_checks_user FOREIGN KEY (checked_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_application_field_checks (application_id, field_key),
  INDEX idx_application_field_checks_application (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
