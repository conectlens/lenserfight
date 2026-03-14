-- Migration: V7 - Tag Activity Logging RPC
-- Description: Creates a secure RPC in the public schema to record tag activity events.
-- This allows the frontend to log views and reactions without direct access to the restricted analytics schema.

CREATE OR REPLACE FUNCTION "public"."fn_tag_activity_log"("p_events" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path TO 'public', 'content', 'analytics'
AS $$
BEGIN
  INSERT INTO analytics.tag_activity_events (tag_id, entity_type, entity_id, activity_type, actor_id)
  SELECT 
    (e->>'tag_id')::uuid,
    (CASE 
        WHEN e->>'entity_type' = 'prompt' THEN 'prompt_template'::content.entity_type_enum
        ELSE (e->>'entity_type')::content.entity_type_enum
     END),
    (e->>'entity_id')::uuid,
    (e->>'activity_type')::text,
    (e->>'actor_id')::uuid
  FROM jsonb_array_elements(p_events) AS e;
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."fn_tag_activity_log"("jsonb") TO anon, authenticated, service_role;
