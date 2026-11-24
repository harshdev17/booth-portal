-- Migration 0090: Admin-editable homepage Corrigendum Notice popup.
--
-- The popup (src/components/public/CorrigendumNoticeModal.tsx) previously
-- had its "Previous"/"Revised" schedule rows hardcoded in the component —
-- every date change needed a code deploy. Moved to the database, same
-- singleton-settings pattern as site_mode_settings (migration 0023) for the
-- on/off switch, and a `notices`-style rows table (migration for the
-- scrolling ticker) for the rows themselves.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS corrigendum_notice_settings (
  id                  BIGINT UNSIGNED PRIMARY KEY,
  enabled             TINYINT(1) NOT NULL DEFAULT 1,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_corrigendum_notice_settings_user FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO corrigendum_notice_settings (id, enabled) VALUES (1, 1)
ON DUPLICATE KEY UPDATE id = id;

CREATE TABLE IF NOT EXISTS corrigendum_notice_rows (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  particular        VARCHAR(500) NOT NULL,
  particular_hi     VARCHAR(500) NOT NULL,
  previous_text     VARCHAR(255) NOT NULL,
  previous_text_hi  VARCHAR(255) NOT NULL,
  revised_text      VARCHAR(255) NOT NULL,
  revised_text_hi   VARCHAR(255) NOT NULL,
  display_order     INT NOT NULL DEFAULT 0,
  status            ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seeded with the rows the component currently hardcodes, so turning this on
-- shows exactly what's already live — nothing changes visually until an
-- admin edits them from /admin/settings/notices.
INSERT INTO corrigendum_notice_rows
  (particular, particular_hi, previous_text, previous_text_hi, revised_text, revised_text_hi, display_order)
VALUES
  ('Application for Govt. Department Category',
   'Government Department Category के लिए आवेदन की अंतिम तारीख',
   '19 November 2026 (5:00 PM)', '19 नवंबर 2026, शाम 5:00 बजे तक',
   '20 November 2026 to 25 November 2026 (up to 11:59 PM)', '20 नवंबर 2026 से 25 नवंबर 2026, रात 11:59 बजे तक',
   1),
  ('Application for Social Organizations (Registered) Category',
   'Social Organizations (पंजीकृत) Category के लिए आवेदन की अंतिम तारीख',
   '19 November 2026 (up to 11:59 PM)', '19 नवंबर 2026, रात 11:59 बजे तक',
   '20 November 2026 to 23 November 2026 (up to 11:59 PM)', '20 नवंबर 2026 से 23 नवंबर 2026, रात 11:59 बजे तक',
   2),
  ('Application for SARAS Category',
   'SARAS Category के लिए आवेदन की अंतिम तारीख',
   '10 November 2026 (5:00 PM)', '10 नवंबर 2026, शाम 5:00 बजे',
   '23 November 2026 (up to 11:59 PM)', '23 नवंबर 2026, रात 11:59 बजे तक',
   3),
  ('Application for Brand Promotion Category',
   'Brand Promotion Category के लिए आवेदन की अंतिम तारीख',
   '15 November 2026 (5:00 PM)', '15 नवंबर 2026, शाम 5:00 बजे',
   '19 November 2026 (up to 11:59 PM)', '19 नवंबर 2026, रात 11:59 बजे तक',
   4),
  ('Application for Refreshment & Ice Cream Category',
   'Refreshment & Ice Cream Category के लिए आवेदन की अंतिम तारीख',
   '10 November 2026 (5:00 PM)', '10 नवंबर 2026, शाम 5:00 बजे',
   '16 November 2026 (11:59 PM)', '16 नवंबर 2026, रात 11:59 बजे',
   5),
  ('Declaration of Results for all categories',
   'सभी कैटेगरी का रिजल्ट घोषित होना',
   '12 November 2026 (11:00 AM)', '12 नवंबर 2026, सुबह 11:00 बजे',
   '16 November 2026 (11:00 AM)', '16 नवंबर 2026, सुबह 11:00 बजे',
   6),
  ('Physical Auction for Refreshment & Ice Cream Booths/Stalls',
   'Refreshment & Ice Cream बूथ/स्टॉल की फिजिकल नीलामी',
   '16 November 2026 (10:00 AM)', '16 नवंबर 2026, सुबह 10:00 बजे',
   '19 November 2026 (10:00 AM)', '19 नवंबर 2026, सुबह 10:00 बजे',
   7);
