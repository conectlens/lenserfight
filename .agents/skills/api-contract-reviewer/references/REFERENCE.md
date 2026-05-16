API contract review method.

Inspect:
- `libs/api/*/src/**/*.ts` (request/response types, DTOs)
- `libs/domain/*/src/**/*.ts` (domain types and invariants)
- `@lenserfight/types` package exports
- `supabase/functions/*/index.ts` (Edge Function request/response shapes)
- OpenAPI/Swagger config if relevant

Report:
- finding
- affected contract
- compatibility impact
- remediation
