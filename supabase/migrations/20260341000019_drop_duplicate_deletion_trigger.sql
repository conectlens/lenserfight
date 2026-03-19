-- Drop the legacy `trg_enforce_deletion_request` trigger and its backing function.
-- `trg_handle_deletion_request` (updated in migration 20260341000018) fully supersedes it
-- and correctly handles the restoration path (clearing deletion_requested_at → NULL).
-- The old function lacked this exception, causing a false "Deletion request can only be
-- set once." error when fn_cancel_account_deletion_on_login attempted to restore an account.

DROP TRIGGER IF EXISTS "trg_enforce_deletion_request" ON "lensers"."profiles";

DROP FUNCTION IF EXISTS "lensers"."enforce_deletion_request"();
