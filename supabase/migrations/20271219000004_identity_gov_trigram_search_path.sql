-- Ensure fn_validate_handle can resolve pg_trgm's % operator at runtime.
-- The function body schema-qualifies table/function references but operator
-- lookup still follows search_path.

ALTER FUNCTION identity_gov.fn_validate_handle(text)
  SET search_path = 'extensions';
