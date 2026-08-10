-- Batch entry point for artifact lifecycle status.
--
-- List pages render one ArtifactLifecycleMenu per row, and each one independently
-- called fn_artifact_lifecycle_status — N PostgREST round-trips to paint N badges,
-- growing linearly with the list. /workflows fires one POST per card.
--
-- The cost being removed is the HTTP round-trip, not the per-artifact query, so
-- this deliberately loops over the existing single-artifact function rather than
-- reimplementing its logic in set form. That function owns two things worth not
-- duplicating:
--
--   * the authorization rule — it calls fn_artifact_can_view and raises 42501 on
--     a miss. A hand-written set-based version would have to restate that check
--     for every artifact type, and any drift between the two becomes a silent
--     information leak on the batch path.
--   * the response shape, including dependency_summary and the per-type state
--     derivation, which differs across lens/workflow/battle/agent.
--
-- One artifact the caller cannot see must not fail the whole page, so a forbidden
-- id is omitted from the result instead of aborting the batch. Callers treat a
-- missing key the same way they already treat a failed single-artifact fetch.
--
-- SECURITY INVOKER on purpose: the callee is already SECURITY DEFINER and derives
-- the actor from auth.uid(), which survives the nested call. Adding another
-- definer layer here would widen the privileged surface for no benefit.

CREATE OR REPLACE FUNCTION "public"."fn_artifact_lifecycle_status_batch"(
  "p_artifact_type" "text",
  "p_artifact_ids"  "uuid"[]
) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY INVOKER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  -- Bounds the loop so a caller cannot turn one request into unbounded work.
  -- Comfortably above any page size the UI renders; callers should paginate.
  c_max_ids CONSTANT integer := 200;
  v_ids     uuid[];
  v_id      uuid;
  v_status  jsonb;
  v_out     jsonb := '{}'::jsonb;
BEGIN
  IF p_artifact_ids IS NULL OR cardinality(p_artifact_ids) = 0 THEN
    RETURN v_out;
  END IF;

  -- De-duplicate: the same artifact can legitimately appear twice in a list.
  SELECT array_agg(DISTINCT id) INTO v_ids FROM unnest(p_artifact_ids) AS id;

  IF cardinality(v_ids) > c_max_ids THEN
    RAISE EXCEPTION
      'fn_artifact_lifecycle_status_batch: % ids requested, limit is %',
      cardinality(v_ids), c_max_ids
      USING ERRCODE = '22023';  -- invalid_parameter_value
  END IF;

  FOREACH v_id IN ARRAY v_ids LOOP
    BEGIN
      v_status := public.fn_artifact_lifecycle_status(p_artifact_type, v_id);
      IF v_status IS NOT NULL THEN
        v_out := v_out || jsonb_build_object(v_id::text, v_status);
      END IF;
    EXCEPTION
      -- insufficient_privilege: the caller cannot view this artifact. Omit it
      -- rather than failing every other badge on the page.
      WHEN insufficient_privilege THEN
        CONTINUE;
    END;
  END LOOP;

  RETURN v_out;
END;
$$;

ALTER FUNCTION "public"."fn_artifact_lifecycle_status_batch"("p_artifact_type" "text", "p_artifact_ids" "uuid"[]) OWNER TO "postgres";
REVOKE ALL     ON FUNCTION "public"."fn_artifact_lifecycle_status_batch"("p_artifact_type" "text", "p_artifact_ids" "uuid"[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_artifact_lifecycle_status_batch"("p_artifact_type" "text", "p_artifact_ids" "uuid"[]) TO "anon";
GRANT  EXECUTE ON FUNCTION "public"."fn_artifact_lifecycle_status_batch"("p_artifact_type" "text", "p_artifact_ids" "uuid"[]) TO "authenticated";
GRANT  EXECUTE ON FUNCTION "public"."fn_artifact_lifecycle_status_batch"("p_artifact_type" "text", "p_artifact_ids" "uuid"[]) TO "service_role";

COMMENT ON FUNCTION "public"."fn_artifact_lifecycle_status_batch"("p_artifact_type" "text", "p_artifact_ids" "uuid"[]) IS
  'Lifecycle status for up to 200 artifacts of one type in a single round-trip, keyed by artifact id. Delegates per id to fn_artifact_lifecycle_status so the visibility check and response shape stay single-sourced; artifacts the caller cannot view are omitted rather than raising.';
