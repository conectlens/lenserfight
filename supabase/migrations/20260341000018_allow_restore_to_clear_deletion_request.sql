-- Allow account restoration flows to clear deletion markers without tripping
-- the one-time deletion request trigger. The trigger should still block
-- changing an existing deletion request to a different timestamp.

CREATE OR REPLACE FUNCTION "lensers"."trg_handle_deletion_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$
BEGIN
  -- First deletion request: force the timestamp and immediately deactivate the profile.
  IF NEW.deletion_requested_at IS NOT NULL AND OLD.deletion_requested_at IS NULL THEN
    NEW.status := 'deactivated';
    NEW.deletion_requested_at := now();
    RETURN NEW;
  END IF;

  -- Restoration path: allow lifecycle RPCs to clear the deletion markers.
  IF OLD.deletion_requested_at IS NOT NULL
     AND NEW.deletion_requested_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Any other mutation of an existing deletion request timestamp remains invalid.
  IF OLD.deletion_requested_at IS NOT NULL
     AND NEW.deletion_requested_at IS DISTINCT FROM OLD.deletion_requested_at THEN
    RAISE EXCEPTION 'Deletion request can only be set once.';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "lensers"."trg_handle_deletion_request"() OWNER TO "postgres";

