---
name: api-contract-reviewer
description: Review Supabase RPC/PostgREST API contracts for DTO correctness, response consistency, validation quality, and backward-compatibility risk. Use when changing libs/api/*, shared response types, or API-facing behavior.
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash
---

Run API contract review for $ARGUMENTS.

Purpose
Review request/response contracts in the requested scope.

Focus
- DTO / type validation (libs/api/*)
- RPC response shape and nullability
- pagination and filtering
- error contract consistency
- backward-compatibility risk
- OpenAPI alignment (supabase/functions/)

Workflow
- Resolve scope from $ARGUMENTS
- Inspect libs/api/*, libs/domain/*, Supabase RPC definitions, and shared types (@lenserfight/types)
- Check request validation and response exposure
- Flag contract drift, unsafe changes, and inconsistent patterns
- Report findings and compatibility risks

Load only when needed
- Review method: [reference guide](references/REFERENCE.md)
- DTO and response checks: [contracts guide](references/contracts.md)