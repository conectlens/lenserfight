-- Fix ambiguous column reference "read_at" in fn_get_notifications.
-- The RETURNS TABLE definition declares a read_at output column; without table
-- aliases Postgres cannot distinguish it from the notifications.read_at column
-- inside the COUNT(*) sub-query, producing error 42702.

CREATE OR REPLACE FUNCTION public.fn_get_notifications(
  p_limit  INT         DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id           UUID,
  type         TEXT,
  title        TEXT,
  body         TEXT,
  action_url   TEXT,
  metadata     JSONB,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
DECLARE
  v_lenser_id UUID := lensers.get_auth_lenser_id();
  v_unread    BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_unread
  FROM   public.notifications AS nc
  WHERE  nc.lenser_id = v_lenser_id
  AND    nc.read_at IS NULL;

  RETURN QUERY
    SELECT
      n.id, n.type, n.title, n.body, n.action_url, n.metadata, n.read_at, n.created_at,
      v_unread
    FROM   public.notifications n
    WHERE  n.lenser_id = v_lenser_id
    AND    (p_cursor IS NULL OR n.created_at < p_cursor)
    ORDER  BY n.created_at DESC
    LIMIT  p_limit;
END;
$$;
