-- Migration 0074: Admin-uploadable "Notification Board" — static notices
-- (PDF or image) an admin can post for public visitors to view/download, at
-- a new /notifications page. Same pattern as category_maps (migration
-- 0047): admin uploads a file, it's stored in R2 under a "notifications/"
-- prefix, served publicly (no auth) through /api/notification-files/[key].
--
-- Separate from the existing `notices` table (migration 0010) — that one
-- is short marquee TEXT strings for the homepage ticker; this is uploaded
-- FILES (PDF/image) listed on their own page, a different kind of content
-- entirely.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS notification_files (
  id                  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title               VARCHAR(191) NOT NULL,
  title_hi            VARCHAR(191) NULL,
  file_path           VARCHAR(255) NOT NULL,
  file_type           ENUM('pdf', 'image') NOT NULL,
  original_filename   VARCHAR(255) NULL,
  display_order       INT UNSIGNED NOT NULL DEFAULT 0,
  status              ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  uploaded_by_user_id BIGINT UNSIGNED NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_files_user FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_notification_files_status_order (status, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
