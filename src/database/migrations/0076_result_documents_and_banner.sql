-- Migration 0076: "Results" PDF uploads (admin-uploadable, no category link,
-- served publicly on /result) and a single-row "Results declared" banner
-- settings table (bilingual text, admin-editable, shown automatically once
-- any category's draw is complete). Same upload/serve pattern as
-- notification_files (migration 0074) and category_maps (migration 0047),
-- but kept as its own table/page per explicit request — this is a distinct
-- content type (official draw results), not a notice.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS result_documents (
  id                  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title               VARCHAR(191) NULL,
  file_path           VARCHAR(255) NOT NULL,
  original_filename   VARCHAR(255) NOT NULL,
  uploaded_by_user_id  BIGINT UNSIGNED NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_result_documents_user FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Single global row (id always 1) — one admin-editable message shown
-- site-wide once any category's draw is complete (see
-- src/lib/draw/results-declared.ts). Not per-category: one message for
-- "results are out, go check" regardless of which category drew first.
CREATE TABLE IF NOT EXISTS results_banner_settings (
  id        TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
  text_en   TEXT NOT NULL,
  text_hi   TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO results_banner_settings (id, text_en, text_hi)
VALUES (1, 'Results declared — check your results!', 'परिणाम घोषित — अपना परिणाम देखें!')
ON DUPLICATE KEY UPDATE id = id;
