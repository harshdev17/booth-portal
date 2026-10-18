-- Migration 0055: Add 'cancelled' to direct_allotments status enum
ALTER TABLE direct_allotments
  MODIFY COLUMN status ENUM('active', 'interchanged', 'cancelled') NOT NULL DEFAULT 'active';
