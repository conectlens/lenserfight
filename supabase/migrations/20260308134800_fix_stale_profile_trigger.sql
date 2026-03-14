-- Migration: Fix Stale Profile Trigger
-- Description: Updates lensers.sync_profile_from_auth_metadata to match the new schema.
-- The previous version of this function attempted to access 'preferred_language', 'ui_language', 
-- and 'detected_language' columns which were dropped in migration 20260307183300.
-- This caused profile creation to fail with code 42703 (undefined_column).

CREATE OR REPLACE FUNCTION "lensers"."sync_profile_from_auth_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    auth_metadata jsonb;
    v_lang_code text;
BEGIN
    -- 1. Retrieve user metadata from auth.users
    SELECT raw_user_meta_data
    INTO auth_metadata
    FROM auth.users
    WHERE id = NEW.user_id;

    IF auth_metadata IS NOT NULL THEN
        -- 2. Map preferred_language (e.g., 'en') from metadata to the new UUID-based preferred_language_id
        v_lang_code := auth_metadata->>'preferred_language';
        
        IF v_lang_code IS NOT NULL AND NEW.preferred_language_id IS NULL THEN
             SELECT id INTO NEW.preferred_language_id 
             FROM core.languages 
             WHERE code = v_lang_code;
        END IF;

        -- 3. Sync country and timezone if they are NULL in the incoming record
        IF NEW.country IS NULL THEN
            NEW.country := auth_metadata->>'country';
        END IF;

        IF NEW.timezone IS NULL THEN
            NEW.timezone := auth_metadata->>'timezone';
        END IF;
    END IF;

    -- 4. Mandatory Fallback: Ensure preferred_language_id is NOT NULL (to satisfy DB constraints)
    IF NEW.preferred_language_id IS NULL THEN
        NEW.preferred_language_id := (SELECT id FROM core.languages WHERE is_default = true LIMIT 1);
    END IF;

    -- NOTE: ui_language and detected_language columns were dropped, so references to them are removed.
    
    RETURN NEW;
END;
$$;

-- Ensure the trigger is correctly pointing to the updated function (it should be automatic, but re-asserting for clarity)
-- The trigger "trg_sync_profile_from_auth_metadata" remains active on "lensers"."profiles".

