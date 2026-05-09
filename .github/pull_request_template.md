## What changed

-

## Why it changed

-

## Validation checklist (AD-3 gate)

- [ ] `pnpm smoke` exits 0 (or `pnpm nx build cli && pnpm nx run web:build` for UI-only changes)
- [ ] `pnpm docs:audit` exits 0 — no CLI docs drift, no OpenAPI drift
- [ ] Docs updated if new surface is added (check `docs/reference/known-preview-surfaces.md` is current)
- [ ] Feature-flag scope honored: new Preview surfaces are behind `VITE_FEATURE_*`
- [ ] No new "Stable" claims added for surfaces not yet in `known-preview-surfaces.md` as Stable

```text
# Paste your validation output here
pnpm smoke
pnpm docs:audit
```

## Screenshots or recordings

- n/a

## Risks or follow-up

-
