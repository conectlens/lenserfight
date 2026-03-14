# Reference

Prefer:
- domain tests for invariants and pure rules
- repository tests for persistence contracts
- feature tests for orchestration
- UI tests for critical interaction behavior
- end-to-end coverage only for high-value flows

For each test:
- behavior
- layer
- why this layer
- fixtures/mocks needed