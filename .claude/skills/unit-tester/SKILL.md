---
name: test-manager
description: Review and improve automated tests for NestJS modules, contracts, and critical flows. Use when changing services, controllers, guards, repositories, billing, wallet, execution, or auth behavior.
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash
---

Run test review for $ARGUMENTS.

Purpose
Ensure the requested scope has effective automated test coverage.

Focus
- missing tests
- weak assertions
- regression gaps
- contract coverage
- critical path coverage

Workflow
- Resolve scope from $ARGUMENTS
- Inspect related `*.spec.ts` and affected runtime code
- Identify untested behavior and brittle tests
- Prefer focused tests for critical invariants and failure paths
- Report missing coverage and best next tests

Load only when needed
- Review method: [references/REFERENCE.md](references/REFERENCE.md)
- Test heuristics: [references/test-rules.md](references/test-rules.md)