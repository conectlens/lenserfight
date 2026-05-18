# Review Checklist

Use this checklist to deepen analysis when the code path is critical or the review needs stronger structure.

## Correctness

- What invariants must hold before and after this code runs?
- Can validation be bypassed by internal callers, background jobs, or deserialization?
- Can the function return success while leaving the system partially updated?
- Are error cases distinguishable enough for callers to respond safely?

## State And Concurrency

- Is there shared mutable state with no clear owner?
- Can two requests observe stale state and both proceed?
- Are read-check-write sequences protected by transactions, locks, or uniqueness constraints?
- Is the handler safe under retries, duplicate delivery, or parallel execution?
- Can cancellation interrupt the code after a side effect but before persistence or acknowledgement?

## Data And Storage

- Are schema assumptions enforced in code and in storage?
- Can serialization lose precision, ordering, or semantic meaning?
- Can migrations break old readers or writers during rollout?
- Are defaults, nullability, and backfills handled explicitly?

## API And Type Boundaries

- Are external inputs parsed once and converted into trusted internal types?
- Do type assertions or casts skip validation?
- Are optional fields treated consistently across layers?
- Can one layer return values another layer cannot represent safely?

## Performance

- Does the code add work proportional to rows, users, or requests in a way that can explode?
- Does it perform repeated I/O inside loops?
- Are caches bounded and invalidated correctly?
- Is expensive work done before cheap rejection checks?

## Security

- Is authorization checked at the boundary closest to the protected resource?
- Are identifiers accepted from the client when they should come from trusted context?
- Can logs, errors, or metrics leak secrets or sensitive data?
- Is untrusted input passed to a query, shell, template, or parser without strict handling?

## Operability

- Will on-call engineers have enough logs, metrics, and trace points to diagnose failures?
- Are retries bounded, observable, and safe?
- Is there a clear rollback or remediation path if deployment goes wrong?

## Testing

- Which invariant is most likely to regress, and is there a test for it?
- Are failure paths and race-prone paths tested?
- Do tests exercise the same integration boundaries used in production?
