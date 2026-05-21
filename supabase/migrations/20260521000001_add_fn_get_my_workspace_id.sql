-- ---------------------------------------------------------------------------
-- fn_get_my_workspace_id
-- Returns the personal workspace UUID for the currently authenticated lenser.
-- Required by browser-side media upload flows (fn_create_media_object demands
-- an explicit workspace_id FK into tenancy.workspaces).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."fn_get_my_workspace_id"()
  RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public', 'lensers', 'tenancy'
AS $$
  SELECT w.id
  FROM   tenancy.workspaces w
  WHERE  w.owner_lenser_id = lensers.get_auth_lenser_id()
    AND  w.type            = 'personal'
    AND  w.status          = 'active'
  ORDER  BY w.created_at ASC
  LIMIT  1;
$$;

GRANT EXECUTE ON FUNCTION "public"."fn_get_my_workspace_id"() TO authenticated;
