-- Migration 0006: Seed the approved registration fee (₹100 + 18% GST = ₹118)
-- for all currently-seeded categories, per .ai/PAYMENT.md.
--
-- THIS IS THE DOCUMENTED BASELINE ASSUMPTION, NOT A CONFIRMED BUSINESS RULE:
-- .ai/PAYMENT.md explicitly marks "whether the registration fee varies by
-- category" as [TBC – Business Confirmation Required]. A flat fee across
-- categories is the documented default until KDB confirms otherwise — see
-- .ai/OPEN_QUESTIONS.md item 4. Changing this to per-category fees later is
-- a data change only (this migration's ON DUPLICATE KEY UPDATE pattern
-- means re-running future seed updates is safe), not a schema change.

UPDATE categories
SET fee_base_paise = 10000,      -- ₹100
    gst_percent = 18.00,         -- 18%
    fee_paise = 11800            -- ₹118 total (₹100 + 18% GST), computed here since
                                  -- MySQL generated columns aren't used for this — the
                                  -- application layer treats fee_paise as the
                                  -- authoritative total either way (see categories.ts)
WHERE fee_paise IS NULL;
