-- Migration 0092: Admin-editable text for the two shared disclaimer banners
-- (PaymentPendingNotice, LetterAvailableNotice) that appear identically on
-- three public surfaces — the Corrigendum popup, /status, and the Allotment
-- Letter page — per explicit request (2026-11-25): "ye bhi admin se hi
-- manage hona chahiye bhai". One singleton settings row; editing it from the
-- admin updates all three surfaces at once, since they already share these
-- same two components.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS site_notice_banners (
  id                      BIGINT UNSIGNED PRIMARY KEY,
  payment_pending_text    VARCHAR(1000) NOT NULL,
  payment_pending_text_hi VARCHAR(1000) NOT NULL,
  letter_available_text   VARCHAR(1000) NOT NULL,
  letter_available_text_hi VARCHAR(1000) NOT NULL,
  updated_by_user_id      BIGINT UNSIGNED NULL,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_site_notice_banners_user FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO site_notice_banners
  (id, payment_pending_text, payment_pending_text_hi, letter_available_text, letter_available_text_hi)
VALUES
  (1,
   'If the amount has been deducted from your bank account after a successful payment, but the portal still shows Pending Payment, please wait 24 hours. Your payment will be updated successfully.',
   'यदि आपकी पेमेंट सफल होने के बाद बैंक खाते से पैसे कट गए हैं, लेकिन पोर्टल पर अभी भी Pending Payment दिखा रहा है, तो कृपया 24 घंटे प्रतीक्षा करें। आपकी पेमेंट सफलतापूर्वक अपडेट हो जाएगी।',
   'The official Allotment Letter for applicants who have paid the allotment fee will be available for download starting 23 November 2026.',
   'आवंटन शुल्क (Allotment Fee) का भुगतान करने वाले आवेदकों का आधिकारिक आवंटन पत्र (Allotment Letter) 23 नवंबर 2026 से डाउनलोड किया जा सकेगा।')
ON DUPLICATE KEY UPDATE id = id;
