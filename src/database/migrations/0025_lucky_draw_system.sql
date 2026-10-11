-- Migration 0025: Lucky Draw System
-- Provides support for provably fair, auditable lucky draw execution,
-- candidate snapshots, stall allocations, waitlists, and draw audit logs.

SET NAMES utf8mb4;

-- 1. Draw Events: tracks each draw execution / round per category
CREATE TABLE IF NOT EXISTS draw_events (
  id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  draw_code                   VARCHAR(64) NOT NULL UNIQUE,
  category_id                 BIGINT UNSIGNED NOT NULL,
  round_number                INT UNSIGNED NOT NULL DEFAULT 1,
  status                      ENUM('draft', 'running', 'completed', 'cancelled') NOT NULL DEFAULT 'completed',
  server_seed                 VARCHAR(128) NOT NULL,
  server_seed_hash            VARCHAR(64) NOT NULL,
  client_seed                 VARCHAR(128) NOT NULL,
  combined_seed_hash          VARCHAR(64) NOT NULL,
  total_eligible_candidates   INT UNSIGNED NOT NULL DEFAULT 0,
  total_available_stalls      INT UNSIGNED NOT NULL DEFAULT 0,
  total_allotted              INT UNSIGNED NOT NULL DEFAULT 0,
  total_waitlisted            INT UNSIGNED NOT NULL DEFAULT 0,
  notes                       TEXT NULL,
  executed_by_user_id         BIGINT UNSIGNED NOT NULL,
  created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at                DATETIME NULL,
  CONSTRAINT fk_draw_events_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_draw_events_user FOREIGN KEY (executed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_draw_events_category (category_id),
  INDEX idx_draw_events_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Draw Candidate Snapshots: immutable record of eligible candidates at draw time
CREATE TABLE IF NOT EXISTS draw_candidate_snapshots (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  draw_event_id       BIGINT UNSIGNED NOT NULL,
  application_id      BIGINT UNSIGNED NOT NULL,
  initial_index       INT UNSIGNED NOT NULL,
  candidate_hash      VARCHAR(64) NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_draw_snapshots_event FOREIGN KEY (draw_event_id) REFERENCES draw_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_draw_snapshots_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  UNIQUE KEY uq_draw_candidate_snapshot (draw_event_id, application_id),
  INDEX idx_draw_snapshots_event (draw_event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Draw Allocations: maps drawn position to allotted stall or waitlist position
CREATE TABLE IF NOT EXISTS draw_allocations (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  draw_event_id       BIGINT UNSIGNED NOT NULL,
  application_id      BIGINT UNSIGNED NOT NULL,
  shop_unit_id        BIGINT UNSIGNED NULL, -- NULL for waitlisted candidates
  allocation_type     ENUM('allotted', 'waitlist') NOT NULL,
  draw_position       INT UNSIGNED NOT NULL, -- 1, 2, 3...
  waitlist_position   INT UNSIGNED NULL,     -- 1, 2, 3... for waitlist
  status              ENUM('allotted', 'confirmed', 'cancelled', 'promoted') NOT NULL DEFAULT 'allotted',
  verification_token  VARCHAR(64) NOT NULL UNIQUE,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_draw_allocations_event FOREIGN KEY (draw_event_id) REFERENCES draw_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_draw_allocations_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_draw_allocations_shop FOREIGN KEY (shop_unit_id) REFERENCES shop_units(id) ON DELETE SET NULL,
  INDEX idx_draw_allocations_event (draw_event_id),
  INDEX idx_draw_allocations_app (application_id),
  INDEX idx_draw_allocations_token (verification_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
