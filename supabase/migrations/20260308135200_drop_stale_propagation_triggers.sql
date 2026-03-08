-- Migration: Drop Stale Profile Propagation Triggers
-- Description: Drops triggers and functions that attempt to update the dropped 'author_profile' columns 
-- in content.threads, content.prompt_templates, and content.thread_replies.
-- These columns were dropped in migration 20260307183303 in favor of dynamic view joins.

DO $$
BEGIN
    -- 1. Drop Triggers on lensers.profiles
    DROP TRIGGER IF EXISTS "trg_lensers_propagate_profile" ON "lensers"."profiles";
    DROP TRIGGER IF EXISTS "trg_lensers_propagate_profile_to_replies" ON "lensers"."profiles";

    -- 2. Drop the stale functions
    DROP FUNCTION IF EXISTS "lensers"."propagate_author_profile_update"() CASCADE;
    DROP FUNCTION IF EXISTS "lensers"."propagate_author_profile_update_to_replies"() CASCADE;
    
    -- 3. Also drop build_author_profile if it's no longer used, 
    -- but usually it's safer to keep it unless we are sure.
    -- In this case, we'll keep it as it's a utility function.
END $$;
