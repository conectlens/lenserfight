-- Drop fn_upsert_profile_from_chainabit: this function auto-created LenserFight profiles
-- without user consent when called from the chainabit-webhook provision.claimed handler.
-- That handler now intentionally ignores provision.claimed events. Users create profiles
-- through the standard onboarding flow only.
DROP FUNCTION IF EXISTS public.fn_upsert_profile_from_chainabit(UUID, TEXT, TEXT, TEXT, TEXT);
