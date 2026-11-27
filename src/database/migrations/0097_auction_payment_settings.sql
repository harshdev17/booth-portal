-- "Auction Payment" public page (2026-11-27): a fully admin-editable
-- offline NEFT/RTGS bank-transfer instructions page, replacing the
-- /auction-payment "Coming Soon" placeholder. Singleton settings row (id=1),
-- same shape as site_notice_banners (migration 0092/0093) — one row, every
-- field admin-editable, no child table needed since the submission form
-- itself is just an admin-supplied external Google Form link, not a
-- database-backed submission flow.
CREATE TABLE auction_payment_settings (
  id                    TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,

  -- Page/header visibility, independently toggleable per explicit request:
  -- "link hide karna ho to hed ruska control bhi admin se ho jaaye ga" —
  -- enabled controls whether the page itself shows real content or falls
  -- back to the existing "Coming Soon" notice; show_in_header controls only
  -- the PublicHeader nav link, so the page can still be open via direct URL
  -- even while hidden from the header.
  enabled               TINYINT(1) NOT NULL DEFAULT 0,
  show_in_header        TINYINT(1) NOT NULL DEFAULT 0,

  beneficiary_name      VARCHAR(255) NULL,
  bank_name             VARCHAR(255) NULL,
  account_number        VARCHAR(100) NULL,
  ifsc_code             VARCHAR(50) NULL,
  branch_name           VARCHAR(255) NULL,
  account_type          VARCHAR(100) NULL,
  payment_mode          VARCHAR(100) NULL,

  instructions_text     TEXT NULL,
  instructions_text_hi  TEXT NULL,
  notice_text           TEXT NULL,
  notice_text_hi        TEXT NULL,

  -- The "submit your transaction details" form at the bottom of the page is
  -- an admin-supplied external Google Form link, not a page built in this
  -- app — per explicit request: "google form ka link aaje ga bas .... admin
  -- hi daal ga ye link bhi".
  google_form_url       VARCHAR(500) NULL,

  updated_by_user_id    BIGINT UNSIGNED NULL,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_auction_payment_settings_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO auction_payment_settings (
  id, enabled, show_in_header, beneficiary_name, account_type, payment_mode,
  instructions_text, instructions_text_hi, notice_text, notice_text_hi
) VALUES (
  1, 0, 0, 'Kurukshetra Development Board', 'Current Account', 'NEFT / RTGS',
  'Transfer the exact applicable auction payment amount.\nEnter your correct application number in the bank transfer remarks, if possible.\nKeep the bank transaction receipt or UTR number.\nAfter making the payment, submit the transaction details using the form below.\nPayment will be subject to verification by the Kurukshetra Development Board.',
  'लागू आबंटन/नीलामी भुगतान की सटीक राशि ट्रांसफर करें।\nयदि संभव हो तो बैंक ट्रांसफर रिमार्क्स में अपना सही आवेदन नंबर दर्ज करें।\nबैंक लेनदेन रसीद या यूटीआर नंबर सुरक्षित रखें।\nभुगतान करने के बाद, नीचे दिए गए फॉर्म का उपयोग करके लेनदेन विवरण जमा करें।\nभुगतान कुरुक्षेत्र डेवलपमेंट बोर्ड द्वारा सत्यापन के अधीन होगा।',
  'Submission of this form does not confirm receipt of payment. Your payment will be considered successful only after the amount is credited to the official bank account and verified by the Kurukshetra Development Board. Please do not submit duplicate payment requests.',
  'इस फॉर्म को जमा करना भुगतान प्राप्ति की पुष्टि नहीं करता है। आपका भुगतान तभी सफल माना जाएगा जब राशि आधिकारिक बैंक खाते में जमा हो जाएगी और कुरुक्षेत्र डेवलपमेंट बोर्ड द्वारा सत्यापित हो जाएगी। कृपया डुप्लिकेट भुगतान अनुरोध जमा न करें।'
);
