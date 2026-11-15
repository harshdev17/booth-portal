-- Migration 0078: Composite index to fix the Applications list page's
-- full-table-scan + filesort on every load. Confirmed via EXPLAIN
-- (2026-11-15): every query on this page (main paginated list, status
-- stats, total count) does `WHERE status != 'draft' ... ORDER BY
-- created_at DESC` and MySQL full-scans `applications` every time
-- (type=ALL, rows=5069) despite idx_applications_status existing — status
-- alone has cardinality 7 across 5069 rows, too low to be selective enough
-- for the optimizer to prefer it over a scan, and there was no index at
-- all covering created_at, forcing a separate filesort after. A composite
-- (status, created_at) index lets MySQL filter AND satisfy the sort order
-- from one index, eliminating both the scan and the filesort. Zero
-- application-code change needed — MySQL picks this index automatically
-- wherever the existing queries already filter by status and sort by
-- created_at.
SET NAMES utf8mb4;

CREATE INDEX idx_applications_status_created_at
  ON applications (status, created_at);
