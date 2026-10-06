-- Migration 0021: "Query Raised" application status + re-upload marker.
--
-- 1. applications.status gains 'query_raised': set automatically when a
--    reviewer raises a query on a document, and flipped back to
--    'under_review' once no document is awaiting the applicant any more.
-- 2. application_documents.reuploaded_at: set when the applicant replaces a
--    document in response to a query, so the admin can see at a glance that
--    a document was updated (the row is otherwise reset to 'pending', which
--    looks identical to a first-time upload).

ALTER TABLE applications
  MODIFY COLUMN status ENUM(
    'draft', 'payment_pending', 'payment_failed', 'payment_success',
    'under_review', 'query_raised', 'rejected', 'selected', 'not_selected',
    'payment_required', 'allotted', 'cancelled', 're_allotted'
  ) NOT NULL DEFAULT 'draft';

ALTER TABLE application_documents
  ADD COLUMN reuploaded_at DATETIME NULL AFTER verified_at;
