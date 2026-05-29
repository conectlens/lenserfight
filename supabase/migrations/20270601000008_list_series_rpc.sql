-- Phase 7: list accessible battle series for the series index page.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_list_series(
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  series_id uuid,
  title text,
  template_id uuid,
  creator_lenser_id uuid,
  round_count integer,
  current_round integer,
  status text,
  current_battle_id uuid,
  current_battle_slug text,
  current_battle_status text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'extensions'
AS $$
  WITH bounded AS (
    SELECT LEAST(GREATEST(COALESCE(p_limit, 24), 1), 50) AS lim,
           GREATEST(COALESCE(p_offset, 0), 0) AS off
  )
  SELECT
    s.id,
    s.title,
    s.template_id,
    s.creator_lenser_id,
    s.round_count,
    s.current_round,
    s.status,
    cb.id,
    cb.slug,
    cb.status::text,
    s.updated_at
  FROM battles.series s
  CROSS JOIN bounded
  LEFT JOIN battles.series_rounds current_round
    ON current_round.series_id = s.id
   AND current_round.round_number = s.current_round
  LEFT JOIN battles.battles cb ON cb.id = current_round.battle_id
  WHERE s.creator_lenser_id = auth.uid()
     OR EXISTS (
       SELECT 1
       FROM battles.series_rounds sr
       JOIN battles.battles b ON b.id = sr.battle_id
       WHERE sr.series_id = s.id
         AND b.status::text = 'published'
     )
  ORDER BY s.updated_at DESC, s.id DESC
  LIMIT (SELECT lim FROM bounded)
  OFFSET (SELECT off FROM bounded);
$$;

REVOKE ALL ON FUNCTION public.fn_list_series(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_list_series(integer, integer) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_list_series(integer, integer) IS
  'Lists accessible battle series with current-round summary. Bounded for public /series page.';

COMMIT;
