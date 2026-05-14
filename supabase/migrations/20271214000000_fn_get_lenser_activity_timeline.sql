-- Phase 36: Lenser activity timeline RPC for profile heatmap.
-- Returns 365 rows (one per calendar day); count = 0 for inactive days.
-- Sources: public/community lens creations + thread creations + reactions
--          (reactions excluded when lensers.preferences.hide_actions = true).
-- Accessible to anon callers; SECURITY DEFINER only reads public/community content.

CREATE OR REPLACE FUNCTION public.fn_get_lenser_activity_timeline(p_handle text)
RETURNS TABLE(date text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH resolved AS (
    SELECT p.id AS lenser_id,
           COALESCE(pr.hide_actions, false) AS hide_actions
    FROM   lensers.profiles p
    LEFT JOIN lensers.preferences pr ON pr.lenser_id = p.id
    WHERE  p.handle = p_handle
    LIMIT  1
  ),
  calendar AS (
    SELECT (current_date - s.i)::date AS day
    FROM generate_series(0, 364) AS s(i)
  ),
  events AS (
    -- Lens creations
    SELECT date_trunc('day', l.created_at)::date AS day
    FROM   lenses.lenses l
    JOIN   resolved r ON r.lenser_id = l.lenser_id
    WHERE  l.visibility IN ('public', 'community')
      AND  l.status = 'published'
      AND  l.created_at >= (current_date - interval '364 days')

    UNION ALL

    -- Thread creations
    SELECT date_trunc('day', t.created_at)::date AS day
    FROM   content.threads t
    JOIN   resolved r ON r.lenser_id = t.lenser_id
    WHERE  t.visibility IN ('public', 'community')
      AND  t.status = 'published'
      AND  t.created_at >= (current_date - interval '364 days')

    UNION ALL

    -- Reactions (skipped when hide_actions = true via JOIN predicate)
    SELECT date_trunc('day', rx.created_at)::date AS day
    FROM   content.reactions rx
    JOIN   resolved r ON r.lenser_id = rx.lenser_id
                      AND r.hide_actions = false
    WHERE  rx.created_at >= (current_date - interval '364 days')
  ),
  daily_counts AS (
    SELECT day, count(*) AS cnt
    FROM   events
    GROUP BY day
  )
  SELECT to_char(c.day, 'YYYY-MM-DD') AS date,
         COALESCE(dc.cnt, 0)          AS count
  FROM   calendar c
  LEFT JOIN daily_counts dc ON dc.day = c.day
  ORDER BY c.day
$$;

REVOKE ALL ON FUNCTION public.fn_get_lenser_activity_timeline(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_lenser_activity_timeline(text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_get_lenser_activity_timeline(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_lenser_activity_timeline(text) TO service_role;
