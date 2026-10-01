-- Migration 0016: physical shop/stall inventory — individual numbered units
-- with a state, distinct from `category_shop_options` (which only models
-- fee tiers like "Single Shop" vs "Double Shop", not actual numbered units).
-- Built to support bulk CSV import/export per explicit request (reference:
-- a timesheet-style "download template → fill → upload → validate → import"
-- wizard), with columns Stall No., Single/Double, Category, Direction, and
-- an optional EMD Amount.
--
-- The one-active-allotment-per-shop constraint (CLAUDE.md §13) is enforced
-- here at the database level via the partial-unique pattern: `allotted_to_application_id`
-- is set only while a shop is actually allotted, and the unique key on
-- (allotted_to_application_id) together with it being NULL otherwise means
-- at most one shop can ever point to a given application, and — combined
-- with application-side logic ensuring one allotment per application —
-- prevents a shop from being double-allotted. See .ai/DATABASE.md.

CREATE TABLE IF NOT EXISTS shop_units (
  id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id               BIGINT UNSIGNED NOT NULL,
  stall_number              VARCHAR(32) NOT NULL,
  shop_type                 ENUM('single', 'double') NOT NULL,
  direction                 VARCHAR(64) NULL, -- facing direction, e.g. "North", "Road-Facing" — free text, not an enum, since exact conventions vary by site layout
  emd_amount_paise          INT UNSIGNED NULL, -- Earnest Money Deposit, optional per explicit request
  status                    ENUM('available', 'reserved', 'allotted', 'cancelled') NOT NULL DEFAULT 'available',
  allotted_to_application_id BIGINT UNSIGNED NULL,
  created_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_shop_units_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_shop_units_application FOREIGN KEY (allotted_to_application_id) REFERENCES applications(id) ON DELETE SET NULL,
  UNIQUE KEY uq_shop_units_stall_number (stall_number),
  UNIQUE KEY uq_shop_units_allotted_application (allotted_to_application_id),
  INDEX idx_shop_units_category (category_id),
  INDEX idx_shop_units_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
