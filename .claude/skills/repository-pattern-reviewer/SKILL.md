---
name: repository-pattern-reviewer
description: Review repositories, cache behavior, data-access boundaries, and error mapping. Use when persistence code becomes leaky, caching is suspicious, or feature code reaches into transport/storage details.
disable-model-invocation: true
---

# Repository Pattern Reviewer

## Use when
- feature code talks to Supabase or transport code directly
- repository responsibilities are unclear
- cache invalidation or data-mapping correctness is suspect

## Workflow
1. Inspect repository boundaries and data flow.
2. Flag abstraction leaks, caching errors, and poor interfaces.
3. Return a cleaner repository contract and migration path.

## Load only when needed
- [Repository review guide](references/REFERENCE.md)
- [Refactor template](assets/repository-refactor-template.md)