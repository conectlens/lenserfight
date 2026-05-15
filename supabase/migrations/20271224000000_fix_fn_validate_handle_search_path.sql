-- Fix: fn_validate_handle fails with "operator does not exist: text % text"
--
-- Root cause: the % trigram similarity operator lives in the extensions schema.
-- Schema-qualified function calls (extensions.similarity, extensions.levenshtein)
-- work fine with SET search_path = '', but *operators* are resolved via
-- search_path only — they cannot be schema-qualified in SQL syntax.
--
-- Migration 20271219000004 attempted to fix this by setting search_path =
-- 'extensions', but that broke resolution of identity_gov.* tables and
-- identity_gov.* helper functions used throughout the pipeline.
--
-- Correct fix: include both identity_gov and extensions (plus pg_catalog for
-- built-ins) so the % operator resolves and all schema references stay valid.

ALTER FUNCTION identity_gov.fn_validate_handle(text)
  SET search_path = 'identity_gov, extensions, pg_catalog';
