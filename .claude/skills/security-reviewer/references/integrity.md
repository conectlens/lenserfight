Review when scope includes wallet, billing, execution, idempotency, webhooks, DB writes, or concurrency-sensitive flows.

Check:
- Are state-changing operations idempotent where required?
- Are webhook events authenticated, deduplicated, and order-safe?
- Are race conditions possible across concurrent requests/workers?
- Are transactional boundaries aligned with domain invariants?
- Are reservations, settlements, refunds, retries, or cancellations replay-safe?
- Are Redis locks/idempotency keys scoped correctly?
- Can duplicate delivery or retry create double effects?

Red flags
- check-then-act without transaction/lock
- non-atomic credit/order/subscription mutations
- missing unique constraints for deduplication
- business invariants enforced only in application memory
- unverified provider payloads