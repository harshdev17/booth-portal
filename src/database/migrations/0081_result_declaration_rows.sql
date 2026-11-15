-- Migration 0081: "Declare Result" flow. An admin uploads a sheet saying
-- which booth/stall goes to which application; each row is staged here as
-- 'pending' WITHOUT touching shop_units.allotted_to_application_id or the
-- application's status, so nothing is visible to applicants and no message
-- is sent. Clicking Declare applies every pending row of the sheet in one
-- transaction (same status/payment rules as a completed draw) and only then
-- notifies the applicants. Uploading a new sheet before declaring marks the
-- previous pending rows 'discarded'.
-- Purely additive: no existing table or row is modified.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS result_declaration_rows (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id             CHAR(36) NOT NULL,
  shop_unit_id         BIGINT UNSIGNED NOT NULL,
  application_id       BIGINT UNSIGNED NOT NULL,
  status               ENUM('pending', 'declared', 'discarded') NOT NULL DEFAULT 'pending',
  uploaded_by_user_id  BIGINT UNSIGNED NULL,
  declared_by_user_id  BIGINT UNSIGNED NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  declared_at          DATETIME NULL,
  CONSTRAINT fk_rdr_shop_unit FOREIGN KEY (shop_unit_id) REFERENCES shop_units(id) ON DELETE CASCADE,
  CONSTRAINT fk_rdr_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_rdr_uploaded_by FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_rdr_declared_by FOREIGN KEY (declared_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_rdr_status_batch (status, batch_id),
  INDEX idx_rdr_application (application_id),
  INDEX idx_rdr_shop_unit (shop_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
