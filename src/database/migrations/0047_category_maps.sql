-- Migration 0047: Stall/Booth location map PDFs — admin-uploadable, one
-- optional PDF per category plus one site-wide "Full Map" PDF (category_id
-- NULL). Seeds the 7 existing reference PDFs already shipped under
-- public/images/public/map/{1..7}.pdf against the 7 of the 9 live
-- categories that have one (display_order 1-7), and the existing
-- map.pdf as the Full Map, so the feature starts pre-populated with what's
-- already on disk; the 2 categories without an existing reference PDF
-- (display_order 8, 10 — Government Departments, Brand Promotion &
-- Corporate) start with no map until the admin uploads one.
--
-- pdf_path is a path under public/ (not outside the web root like applicant
-- document uploads) because these are meant to be publicly viewable by any
-- site visitor, same as any other static asset — there is no applicant
-- ownership check to apply here.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS category_maps (
  id                  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category_id         BIGINT UNSIGNED NULL UNIQUE,
  pdf_path            VARCHAR(255) NOT NULL,
  original_filename   VARCHAR(255) NULL,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_category_maps_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  CONSTRAINT fk_category_maps_user FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A single row with category_id = NULL holds the Full Map PDF.
INSERT INTO category_maps (category_id, pdf_path, original_filename)
VALUES (NULL, '/images/public/map/map.pdf', 'map.pdf')
ON DUPLICATE KEY UPDATE pdf_path = VALUES(pdf_path);

-- Seed the 7 existing per-category reference PDFs against the live
-- categories at display_order 1-7 (in that order), matching file numbering.
SET @map_seq = 0;

INSERT INTO category_maps (category_id, pdf_path, original_filename)
SELECT id, CONCAT('/images/public/map/', (@map_seq := @map_seq + 1), '.pdf'), CONCAT(@map_seq, '.pdf')
FROM categories
WHERE status = 'open' AND display_order <= 7
ORDER BY display_order
ON DUPLICATE KEY UPDATE pdf_path = VALUES(pdf_path);
