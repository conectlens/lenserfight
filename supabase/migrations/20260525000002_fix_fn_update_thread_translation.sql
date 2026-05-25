-- Fix fn_update_thread_translation: remove non-existent updated_at column reference.
-- entity_translations has no updated_at column; the SET clause was causing a 42703 error.

CREATE OR REPLACE FUNCTION "public"."fn_update_thread_translation"(
  "p_thread_id" "uuid",
  "p_title"     "text",
  "p_content"   "text"
) RETURNS "void"
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public', 'content', 'lensers'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM content.threads
    WHERE id = p_thread_id AND lenser_id = lensers.get_auth_lenser_id()
  ) THEN
    RETURN;
  END IF;

  UPDATE content.entity_translations
  SET    title      = p_title,
         content    = p_content
  WHERE  entity_type::text = 'thread'
    AND  entity_id   = p_thread_id
    AND  is_original = true;
END;
$$;

ALTER FUNCTION "public"."fn_update_thread_translation"("p_thread_id" "uuid", "p_title" "text", "p_content" "text")
  OWNER TO "postgres";
