-- Adds required police station name/address fields to every application,
-- collected as common fields alongside father_name etc. (per explicit
-- request, 2026-10-27). NOT NULL DEFAULT '' so the migration is safe
-- against existing rows.
ALTER TABLE applications
  ADD COLUMN police_station_name    VARCHAR(191) NOT NULL DEFAULT '' AFTER father_name,
  ADD COLUMN police_station_address VARCHAR(512) NOT NULL DEFAULT '' AFTER police_station_name;
