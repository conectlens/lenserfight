# scripts/

Utility scripts for local development, CI, seeding, and validation.

| Script | Purpose |
|---|---|
| `check-node-docs.sh` | CI check — verifies every `WorkflowNodeType` has a doc under `docs/en/reference/workflow-nodes/<type>.md`; exits 1 with `MISSING:` lines if any are absent |
| `coverage-gate.sh` | Enforces minimum test coverage thresholds |
| `dev-start.sh` / `dev-teardown.sh` | Start and stop the local dev stack |
| `e2e-battle.sh` | End-to-end battle smoke test |
| `run-pgtap.sh` | Run pgTAP database tests |
| `seed-local.sh` / `seed-demo.sh` / `seed-ci.sh` | Seed the database for local / demo / CI environments |
| `smoke.sh` / `smoke-dev.sh` / `smoke-media.sh` | Smoke tests for API, dev stack, and media endpoints |
| `validate-oss-migrations.sh` | Validate Supabase migration files for OSS readiness |
