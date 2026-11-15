-- Migration 0082: Applicant notes on query response.
-- Adds optional notes field for applicants when responding to field-level queries
-- or document re-uploads, preserving their explanations in the audit/query trail.
SET NAMES utf8mb4;

ALTER TABLE application_field_queries
  ADD COLUMN applicant_notes TEXT NULL AFTER new_value;

ALTER TABLE application_documents
  ADD COLUMN reupload_notes TEXT NULL AFTER verification_remarks;

