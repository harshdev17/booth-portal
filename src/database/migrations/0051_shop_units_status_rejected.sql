-- Migration 0051: Add 'rejected' to shop_units status enum
ALTER TABLE shop_units
  MODIFY COLUMN status ENUM('available', 'reserved', 'allotted', 'cancelled', 'rejected') NOT NULL DEFAULT 'available';
