## Summary

-

## Test plan

- pgTAP `plan()` total: <!-- e.g. plan(4) — write "none" if no DB changes -->
- Vitest test count added/changed: <!-- e.g. +2 tests in battle.spec.ts -->

```text
# Paste relevant test output here
pnpm run-pgtap        (DB changes)
pnpm nx test <project> --testFile=path/to/file.spec.ts
pnpm smoke            (full gate)
```

## Migration blast radius

<!-- "none" if no migration. Otherwise: which tables are altered, estimated row count, rollback path. -->

none

## Screenshots

<!-- Required for UI changes. Paste before/after side by side. Write "n/a" if not a UI change. -->

n/a

## Risks or follow-up

-

## Security, privacy, and legal surface

- [ ] No secrets, private data, provider keys, customer data, or exploit details are included.
- [ ] New agent/workflow/BYOK/provider/tool behavior documents permissions, costs, privacy, and misuse risks.
- [ ] Public docs avoid unsupported claims such as production-ready, guaranteed, secure by default, anonymous, compliant, or zero risk.
