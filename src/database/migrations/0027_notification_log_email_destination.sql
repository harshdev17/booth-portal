-- Migration 0027: notification_log.destination held a mobile number only
-- (VARCHAR(20)); email notifications log the address, which can be longer.

ALTER TABLE notification_log MODIFY COLUMN destination VARCHAR(191) NOT NULL;
