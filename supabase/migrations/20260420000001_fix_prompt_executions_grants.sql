-- Fix: ensure prompt_executions table grants are applied.
-- The table was created in 20260401000002 but grants may not be present on local instances.

-- Authenticated: SELECT + INSERT (RLS restricts rows to own lenser_id)
GRANT SELECT, INSERT ON TABLE "content"."prompt_executions" TO "authenticated";
GRANT ALL ON TABLE "content"."prompt_executions" TO "service_role";

-- Anon: SELECT only — RLS has no policy for anon so result is always empty,
-- but the table-level grant prevents PostgREST from returning 403 instead of 200+[].
GRANT SELECT ON TABLE "content"."prompt_executions" TO "anon";

-- Enum type access
GRANT USAGE ON TYPE "content"."payment_method_enum" TO "authenticated";
GRANT USAGE ON TYPE "content"."payment_method_enum" TO "anon";
