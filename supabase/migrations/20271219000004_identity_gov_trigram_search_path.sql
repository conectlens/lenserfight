-- Ensure fn_validate_handle can resolve pg_trgm's % operator at runtime.
-- The function body schema-qualifies table/function references but operator
-- lookup still follows search_path.
--
-- NOTE: search_path must include identity_gov (for table/function resolution)
-- AND extensions (for the % operator and other pg_trgm/fuzzystrmatch symbols).
-- Setting only 'extensions' breaks identity_gov.* resolution; setting only ''
-- breaks the % operator. See migration 20271224000000 for the authoritative fix.

ALTER FUNCTION identity_gov.fn_validate_handle(text)
  SET search_path = 'identity_gov, extensions, pg_catalog';
