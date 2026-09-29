-- Migration 0012: Payments + PaymentTransactions (Razorpay registration fee).
--
-- Models the two-entity payment structure required by .ai/PAYMENT.md and
-- .ai/DATABASE.md Section 2: `payments` holds one logical payment
-- obligation per application/stage (currently only 'registration'; 'pay_now'
-- is reserved for the admin-activated second payment described in
-- .ai/BUSINESS_RULES.md, whose amount/timing are still
-- [TBC - Business Confirmation Required] and are not built yet).
-- `payment_transactions` is the append-only audit trail of every attempt —
-- order creation, checkout result, webhook confirmation, refund — and is
-- never updated or deleted; `payments.status` is a derived/current-state
-- field only.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id        BIGINT UNSIGNED NOT NULL,
  purpose               ENUM('registration', 'pay_now') NOT NULL DEFAULT 'registration',
  amount_paise          INT UNSIGNED NOT NULL,
  status                ENUM('not_initiated', 'pending', 'success', 'failed', 'refunded') NOT NULL DEFAULT 'not_initiated',
  razorpay_order_id     VARCHAR(64) NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_payments_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT,
  -- One payment obligation per application per purpose — a retried/failed
  -- registration payment reuses the same row (new order id, new
  -- transactions), it never creates a second "registration" payment.
  UNIQUE KEY uq_payments_application_purpose (application_id, purpose),
  INDEX idx_payments_status (status),
  INDEX idx_payments_razorpay_order (razorpay_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_transactions (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_id              BIGINT UNSIGNED NOT NULL,
  type                    ENUM(
                            'order_created', 'checkout_success', 'checkout_failed',
                            'webhook_confirmed', 'webhook_failed', 'refund'
                          ) NOT NULL,
  amount_paise            INT UNSIGNED NOT NULL,
  razorpay_order_id       VARCHAR(64) NULL,
  razorpay_payment_id     VARCHAR(64) NULL,
  signature_valid         TINYINT(1) NULL,
  failure_reason          VARCHAR(512) NULL,
  source                  ENUM('system', 'applicant', 'webhook', 'admin') NOT NULL,
  -- Razorpay webhook event id, e.g. "evt_...". Unique so a webhook retried by
  -- Razorpay (same event delivered twice) can never be double-processed.
  -- MySQL unique indexes allow multiple NULLs, so non-webhook rows are fine.
  webhook_event_id        VARCHAR(128) NULL,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_payment_transactions_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_payment_transactions_webhook_event (webhook_event_id),
  INDEX idx_payment_transactions_payment (payment_id),
  INDEX idx_payment_transactions_razorpay_payment (razorpay_payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
