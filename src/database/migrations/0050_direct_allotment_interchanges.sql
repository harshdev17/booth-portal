-- Keep every direct-allotment interchange as history; only one active row may
-- exist per booth/stall at a time.
CREATE TABLE IF NOT EXISTS direct_allotment_changes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  change_type ENUM('interchange') NOT NULL,
  reason VARCHAR(1024) NOT NULL,
  performed_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_direct_allotment_changes_user FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE direct_allotments
  ADD COLUMN status ENUM('active', 'interchanged') NOT NULL DEFAULT 'active' AFTER notes,
  ADD COLUMN change_id BIGINT UNSIGNED NULL AFTER status,
  ADD COLUMN replaced_by_allotment_id BIGINT UNSIGNED NULL AFTER change_id,
  ADD COLUMN active_shop_unit_id BIGINT UNSIGNED GENERATED ALWAYS AS (IF(status = 'active', shop_unit_id, NULL)) STORED,
  ADD INDEX idx_direct_allotments_shop (shop_unit_id),
  DROP INDEX uq_direct_allotments_shop,
  ADD UNIQUE KEY uq_direct_allotments_active_shop (active_shop_unit_id);

