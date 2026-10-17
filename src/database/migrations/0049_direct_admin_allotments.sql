-- Direct/admin-only allotments: categories that never appear on the public
-- application form, plus their manually entered allottees.
ALTER TABLE categories
  ADD COLUMN is_direct_allotment TINYINT(1) NOT NULL DEFAULT 0 AFTER status;

CREATE TABLE IF NOT EXISTS direct_allotments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  shop_unit_id BIGINT UNSIGNED NOT NULL,
  allottee_name VARCHAR(191) NOT NULL,
  contact_person VARCHAR(191) NULL,
  mobile_number VARCHAR(15) NULL,
  notes VARCHAR(1024) NULL,
  allotted_by_user_id BIGINT UNSIGNED NOT NULL,
  allotted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_direct_allotments_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_direct_allotments_shop FOREIGN KEY (shop_unit_id) REFERENCES shop_units(id) ON DELETE RESTRICT,
  CONSTRAINT fk_direct_allotments_user FOREIGN KEY (allotted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_direct_allotments_shop (shop_unit_id),
  INDEX idx_direct_allotments_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
