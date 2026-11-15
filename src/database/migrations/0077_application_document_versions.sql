-- Migration 0077: Preserve the previous file whenever an applicant
-- re-uploads a document in response to a query — application_documents
-- previously overwrote original_filename/storage_path/etc. in place
-- (ON DUPLICATE KEY UPDATE in src/app/api/applications/[id]/documents/route.ts),
-- leaving no trace of what the admin actually reviewed before raising the
-- query. The CURRENT version still lives in application_documents exactly
-- as before (unchanged shape); this table holds every version that was
-- SUPERSEDED by a later re-upload. Only applies going forward — past
-- overwrites are not recoverable (object keys carry no document-type
-- marker, and no prior audit entry captured the old storage_path).
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS application_document_versions (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_document_id BIGINT UNSIGNED NOT NULL,
  original_filename       VARCHAR(255) NOT NULL,
  storage_path            VARCHAR(255) NOT NULL,
  mime_type               VARCHAR(100) NOT NULL,
  size_bytes              INT UNSIGNED NOT NULL,
  content_sha256          CHAR(64) NULL,
  verification_status     ENUM('pending', 'verified', 'rejected', 'query') NOT NULL,
  verification_remarks    VARCHAR(512) NULL,
  superseded_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_adv_document FOREIGN KEY (application_document_id) REFERENCES application_documents(id) ON DELETE CASCADE,
  INDEX idx_adv_document (application_document_id, superseded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
