---
name: supabase-api-rpc-reviewer
description: Review Supabase SQL functions, RPC exposure, return contracts, and API-facing database surfaces. Use for public API design, function hardening, response stability, and deciding between direct table access and RPC.
---

# Supabase API RPC Reviewer

## Use when
- adding or changing SQL functions or RPCs
- reviewing API exposure through the database layer
- deciding whether an operation should be a function, view, or table access path

## Workflow
1. Inspect the API-facing database surface.
2. Flag unstable contracts, privilege problems, and unnecessary RPC complexity.
3. Return the safest interface shape and exact adjustments.

## Load only when needed
- [RPC review guide](references/REFERENCE.md)
- [Function contract template](assets/function-contract-template.md)