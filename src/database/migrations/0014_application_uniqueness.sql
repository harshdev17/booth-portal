-- Migration 0014: enforce one application per mobile number and one
-- application per Aadhaar number, portal-wide (not per-category).
--
-- `aadhaar_ciphertext` is AES-256-GCM (non-deterministic — a fresh random IV
-- every time), so it can never be used for an equality/uniqueness lookup.
-- `aadhaar_hash` is a separate deterministic HMAC-SHA256(aadhaar, secret)
-- column computed alongside it purely for this duplicate check — it is a
-- one-way keyed hash, not decryptable, and reveals nothing about the
-- Aadhaar number itself (see src/lib/applications/aadhaar-crypto.ts).
ALTER TABLE applications
  ADD COLUMN aadhaar_hash CHAR(64) NULL AFTER aadhaar_last4;

CREATE INDEX idx_applications_aadhaar_hash ON applications (aadhaar_hash);
