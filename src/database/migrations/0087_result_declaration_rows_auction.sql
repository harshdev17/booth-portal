-- Reuses the Declare Result staging/pending/declared/history flow
-- (result_declaration_rows, migration 0081) for Auction Results too, instead
-- of the separate single-step import that lived at
-- /api/admin/applications/auction-results — same "upload -> preview (staged
-- as pending) -> Declare" two-step flow the draw/manual sheet already has,
-- same discard-previous-pending-on-reupload safety, same declared rows never
-- get re-notified on a later upload.
--
-- `purpose` distinguishes the two sheet types sharing this one table/history
-- view. `final_amount_paise` is auction-only (the winning bid, which varies
-- per row and is supplied in the sheet) — draw rows keep resolving their
-- amount from the category's configured allotment_amount_paise via
-- resolveAllotmentAmountPaise(), same as before; this column stays NULL for
-- them.
ALTER TABLE result_declaration_rows
  ADD COLUMN purpose ENUM('draw_allotment', 'auction_result') NOT NULL DEFAULT 'draw_allotment' AFTER batch_id,
  ADD COLUMN final_amount_paise INT UNSIGNED NULL AFTER application_id;
