-- Backfill: set is_public = true for users where it is NULL
-- (users created before the is_public column was added)
UPDATE users SET is_public = true WHERE is_public IS NULL;
