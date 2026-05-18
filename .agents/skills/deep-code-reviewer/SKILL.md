---
name: deep-code-reviewer
description: Perform rigorous, architecture-aware code review focused on subtle correctness bugs, race conditions, performance regressions, type-safety holes, security issues, and maintainability flaws that surface-level review misses. Use when the user asks for comprehensive or deep review, requests design critique, wants edge-case or concurrency analysis, needs production-readiness feedback, or is reviewing critical paths, complex services, transaction handlers, auth flows, infrastructure code, or other high-risk changes.
---

# Deep Code Reviewer

Perform review as an auditor, not as a summarizer. Prioritize findings that can cause incorrect behavior, operational pain, or expensive future changes.

## Quick Start

1. Establish scope before judging details.
2. Inspect surrounding code, not just the diff or pasted snippet.
3. Trace data flow, control flow, state transitions, and failure paths.
4. Produce findings ordered by severity with concrete file references.
5. Keep summaries brief and secondary to the findings.

## Review Workflow

### 1. Build Context

Read enough code to understand:

- Entry points and callers
- State ownership and mutation boundaries
- Invariants that must always hold
- External dependencies: databases, queues, caches, RPCs, files, clocks, feature flags
- Existing tests and what they do not cover

If the change touches a framework or subsystem with non-obvious behavior, read the local docs or implementation that defines the contract before concluding.

### 2. Hunt for High-Impact Failures First

Check for:

- Incorrectness: broken invariants, off-by-one logic, missing validation, bad error handling, partial updates
- Concurrency hazards: races, duplicate work, lost updates, stale reads, deadlocks, non-atomic sequences
- Security flaws: authorization gaps, trust-boundary violations, secret leakage, injection vectors
- Data integrity issues: transaction gaps, mismatched schemas, silent truncation, incompatible migrations
- Performance cliffs: N+1 queries, unnecessary allocations, hot-loop work, unbounded retries, lock contention
- Type-safety holes: unsafe casts, invalid narrowing, nil/null handling gaps, unsound generics, unchecked parsing
- Operational risks: weak observability, bad retry semantics, missing idempotency, unsafe rollout assumptions

### 3. Evaluate Architecture and Design

Judge whether the design makes future failures likely even if the current code appears correct.

Look for:

- Responsibilities split across the wrong boundaries
- APIs that hide important invariants or encourage misuse
- Tight coupling to volatile details
- Configuration or feature-flag logic that creates invalid states
- Missing abstractions where duplication is already diverging
- Premature abstractions that make correctness harder to reason about

Prefer comments on architecture only when they imply real delivery or maintenance risk.

### 4. Stress Edge Cases

Actively test mental scenarios such as:

- Empty, null, duplicate, stale, or out-of-order inputs
- Timeout, cancellation, retry, and partial-failure paths
- Multi-tenant or cross-user isolation boundaries
- Boundary values, integer overflow, time zone, locale, and clock skew issues
- Re-entrancy, repeated webhooks, at-least-once delivery, and replayed requests
- Startup, shutdown, migration, and backfill behavior

### 5. Verify With Tests, Then Critique Test Gaps

Do not stop at "tests exist". Check whether tests cover:

- The critical invariant, not just the happy path
- Failure behavior and rollback semantics
- Concurrency or repeated invocation
- Serialization and schema boundaries
- Performance-sensitive behavior when relevant

Call out missing tests only when they leave meaningful risk unaddressed.

## Output Format

Default to a code-review response:

1. Findings first, ordered by severity
2. Each finding states the problem, why it matters, and the condition that triggers it
3. Include precise file references when available
4. Follow with open questions or assumptions only if they affect confidence
5. End with a short change summary or residual risk note

If no findings are discovered, say so explicitly and mention any remaining testing or confidence limits.

## Review Heuristics

Load [references/review-checklist.md](./references/review-checklist.md) when you need a deeper prompt for correctness, concurrency, data, performance, or API-boundary analysis. Use it selectively; do not dump the whole checklist into the response.

## Constraints

- Do not pad the review with style nits unless they create real defects or maintenance cost.
- Do not invent speculative issues without a concrete failure mode.
- Do not praise code quality unless the user asks for overall assessment.
- Prefer fewer high-confidence findings over a long weak list.
- If you cannot verify an assumption from local context, mark it as an assumption.

## Example Triggers

- Review my authentication module for edge cases and race conditions.
- Analyze this transaction handler for correctness and performance bottlenecks.
- Is there anything architecturally wrong with how I structured these services?
