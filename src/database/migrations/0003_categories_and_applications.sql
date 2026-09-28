-- Migration 0003: Public application flow — categories, dynamic field/document
-- configuration, applications, and their submitted values/documents.
--
-- Design notes:
-- - category_field_definitions / category_document_definitions drive what the
--   FRONTEND renders per category, but are re-validated independently by the
--   backend at submission time — this configuration is never trusted as
--   authoritative (see .ai/SECURITY.md, .ai/ADMIN_TRANSFORMATION_PLAN.md).
-- - No bank-detail fields are seeded anywhere in this migration, and none may
--   ever be added to category_field_definitions — enforced additionally in
--   application code via a hardcoded denylist (src/lib/applications/schema.ts)
--   as defense in depth against a future misconfiguration.
-- - applications.access_token_hash stores only a hash of the applicant's
--   ownership token (never the raw token — same principle as password
--   storage), following the interim no-OTP ownership decision recorded in
--   .ai/DECISIONS.md.

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------
-- events: one row per edition of the event (International Gita Mahotsav
-- 2026, etc.). Kept minimal — most "event" concepts already live on
-- categories, but a dated a top-level event record lets application windows
-- and category sets be scoped to a specific year without ambiguity.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(191) NOT NULL,
  slug              VARCHAR(191) NOT NULL UNIQUE,
  starts_on         DATE NULL,
  ends_on           DATE NULL,
  status            ENUM('draft', 'active', 'closed') NOT NULL DEFAULT 'draft',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------
-- categories: configurable shop/stall/participation categories.
-- Selection method and fee are descriptive/display fields here — the
-- authoritative fee used in payment calculation always comes from this row
-- read server-side at submission/payment time, never from client input.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id          BIGINT UNSIGNED NOT NULL,
  slug              VARCHAR(191) NOT NULL,
  name              VARCHAR(191) NOT NULL,
  name_hi           VARCHAR(191) NULL, -- Hindi name, homepage is Hindi-first per HOMEPAGE.md
  description       TEXT NULL,
  description_hi    TEXT NULL,
  selection_method  ENUM('draw', 'manual', 'auction', 'tender', 'application_fee') NOT NULL,
  fee_paise         INT UNSIGNED NULL, -- amount in paise; NULL = no fee configured yet, see PAYMENT.md
  application_opens_at  DATETIME NULL,
  application_closes_at DATETIME NULL,
  status            ENUM('draft', 'open', 'closed', 'archived') NOT NULL DEFAULT 'draft',
  display_order     INT UNSIGNED NOT NULL DEFAULT 0,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE KEY uq_categories_event_slug (event_id, slug),
  INDEX idx_categories_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------
-- category_shop_options: for categories with a shop/stall size or type
-- selection (e.g. "Single Shop" vs "Double Shop"), each with its own fee.
-- Optional — a category with no rows here simply has no such selection.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS category_shop_options (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id       BIGINT UNSIGNED NOT NULL,
  label             VARCHAR(191) NOT NULL, -- e.g. 'Single Shop', 'Double Shop'
  fee_paise         INT UNSIGNED NULL,
  display_order     INT UNSIGNED NOT NULL DEFAULT 0,
  status            ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shop_options_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_shop_options_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------
-- category_field_definitions: drives dynamic form rendering AND server-side
-- validation for category-specific fields. Common fields (email, mobile,
-- Aadhaar, address block, etc.) are fixed in application code, not
-- configured here, since they apply to every category identically — only
-- category-specific extra fields are defined per row.
--
-- `field_key` values 'bank_name', 'account_holder', 'account_number',
-- 'branch_name', 'ifsc_code' (and close variants) are permanently rejected
-- by application code regardless of what is inserted here — see
-- src/lib/applications/schema.ts BANNED_FIELD_KEYS.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS category_field_definitions (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id       BIGINT UNSIGNED NOT NULL,
  field_key         VARCHAR(64) NOT NULL, -- machine key, e.g. 'shop_option_id'
  label             VARCHAR(191) NOT NULL,
  label_hi          VARCHAR(191) NULL,
  input_type        ENUM('text', 'textarea', 'select', 'radio') NOT NULL,
  is_required       TINYINT(1) NOT NULL DEFAULT 1,
  max_length        SMALLINT UNSIGNED NULL, -- enforced server-side; NULL = use type default cap
  options_json      JSON NULL, -- for select/radio: [{ "value": "...", "label": "..." }]
  display_order     INT UNSIGNED NOT NULL DEFAULT 0,
  status            ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_field_definitions_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE KEY uq_field_definitions_category_key (category_id, field_key),
  INDEX idx_field_definitions_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------
-- category_document_definitions: required/optional document types per
-- category (e.g. Aadhaar, Registration Certificate, Artisan Card).
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS category_document_definitions (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id       BIGINT UNSIGNED NOT NULL,
  document_key      VARCHAR(64) NOT NULL, -- e.g. 'aadhaar_card', 'registration_certificate'
  label             VARCHAR(191) NOT NULL,
  label_hi          VARCHAR(191) NULL,
  is_required       TINYINT(1) NOT NULL DEFAULT 1,
  allowed_mime_types VARCHAR(255) NOT NULL DEFAULT 'application/pdf,image/jpeg,image/png',
  max_size_bytes    INT UNSIGNED NOT NULL DEFAULT 2097152, -- 2 MB, matches prior-year precedent
  display_order     INT UNSIGNED NOT NULL DEFAULT 0,
  status            ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_document_definitions_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE KEY uq_document_definitions_category_key (category_id, document_key),
  INDEX idx_document_definitions_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------
-- applications: one row per applicant submission. Common fields are real
-- columns (queryable, indexable, and this guarantees they can never be
-- silently dropped or renamed by a configuration change); category-specific
-- field values live in application_field_values.
--
-- aadhaar_number is stored encrypted at the application layer (see
-- src/lib/applications/crypto.ts) — this column holds ciphertext, never
-- plaintext. aadhaar_last4 is a small, deliberately-limited plaintext
-- extract used only for display masking and status-lookup matching.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_number    VARCHAR(32) NOT NULL UNIQUE, -- human-facing, e.g. KDB-2026-000123
  category_id           BIGINT UNSIGNED NOT NULL,
  shop_option_id        BIGINT UNSIGNED NULL,

  -- Common applicant fields (see .ai/APPLICATION_FLOW.md, category field matrix)
  email                 VARCHAR(191) NOT NULL,
  organisation_name     VARCHAR(191) NOT NULL,
  representative_name   VARCHAR(191) NOT NULL,
  father_name           VARCHAR(191) NOT NULL,
  aadhaar_ciphertext     VARBINARY(512) NOT NULL,
  aadhaar_last4         CHAR(4) NOT NULL,
  address               VARCHAR(512) NOT NULL,
  state                 VARCHAR(100) NOT NULL,
  district              VARCHAR(100) NOT NULL,
  pin_code              CHAR(6) NOT NULL,
  mobile_number         VARCHAR(15) NOT NULL,
  alternate_mobile      VARCHAR(15) NULL,
  work_purpose          VARCHAR(512) NOT NULL,
  achievement_experience VARCHAR(1024) NOT NULL,
  remarks               VARCHAR(1024) NULL,

  status                ENUM(
                          'draft', 'payment_pending', 'payment_failed', 'payment_success',
                          'under_review', 'rejected', 'selected', 'not_selected',
                          'payment_required', 'allotted', 'cancelled', 're_allotted'
                        ) NOT NULL DEFAULT 'draft',

  -- Ownership token (interim, pre-OTP mechanism — see .ai/DECISIONS.md).
  -- Only a hash is stored; the raw token is shown to the applicant once, on
  -- the confirmation page, and never persisted or logged in plaintext.
  access_token_hash     CHAR(64) NOT NULL,

  declaration_accepted_at DATETIME NULL,
  submitted_at          DATETIME NULL,
  ip_address            VARCHAR(64) NULL, -- see .ai/OPEN_QUESTIONS.md — only if approved
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_applications_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_applications_shop_option FOREIGN KEY (shop_option_id) REFERENCES category_shop_options(id) ON DELETE SET NULL,
  INDEX idx_applications_category (category_id),
  INDEX idx_applications_status (status),
  INDEX idx_applications_mobile (mobile_number),
  INDEX idx_applications_submitted_at (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------
-- application_field_values: category-specific field answers, keyed against
-- category_field_definitions. Kept as an EAV-style table deliberately (not
-- a JSON blob on `applications`) so each value can carry its own audit
-- trail and so field definitions can evolve without a schema migration.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_field_values (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id        BIGINT UNSIGNED NOT NULL,
  field_definition_id   BIGINT UNSIGNED NOT NULL,
  value                 VARCHAR(1024) NOT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_field_values_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_field_values_definition FOREIGN KEY (field_definition_id) REFERENCES category_field_definitions(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_field_values_application_field (application_id, field_definition_id),
  INDEX idx_field_values_application (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------
-- application_documents: uploaded documents. `storage_path` is an internal,
-- non-guessable reference (never a public URL) — see .ai/STORAGE.md and
-- src/lib/uploads/storage.ts. `content_sha256` supports basic integrity
-- checking and duplicate-detection; it is not itself a security boundary.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_documents (
  id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id            BIGINT UNSIGNED NOT NULL,
  document_definition_id    BIGINT UNSIGNED NOT NULL,
  original_filename         VARCHAR(255) NOT NULL, -- stored for display only, never used to build a path
  storage_path              VARCHAR(255) NOT NULL, -- random, generated — see src/lib/uploads/storage.ts
  mime_type                 VARCHAR(100) NOT NULL, -- server-detected (magic bytes), not client-reported
  size_bytes                INT UNSIGNED NOT NULL,
  content_sha256            CHAR(64) NOT NULL,
  verification_status       ENUM('pending', 'verified', 'rejected', 'query') NOT NULL DEFAULT 'pending',
  verification_remarks      VARCHAR(512) NULL,
  verified_by_user_id       BIGINT UNSIGNED NULL,
  verified_at               DATETIME NULL,
  created_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_documents_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_documents_definition FOREIGN KEY (document_definition_id) REFERENCES category_document_definitions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_app_documents_verifier FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_app_documents_application_definition (application_id, document_definition_id),
  INDEX idx_app_documents_application (application_id),
  INDEX idx_app_documents_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
