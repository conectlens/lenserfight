# Language Integrator Reference

## Mental Model

Think in three layers:

1. Feature-owned locale bundles
2. App-level locale composition
3. User preference flow

That is the whole system. Keep the implementation simple and feature-owned.
Feature bundles live in `libs/features/<feature>/src/lib/i18n/`; the forum app
only composes them and applies the active language.

## File Tree

| File | Role |
| --- | --- |
| `libs/features/<feature>/src/lib/i18n/{LOCALE}.ts` | Feature locale bundle |
| `libs/features/<feature>/src/index.ts` | Re-export feature locale bundle |
| `apps/web/src/i18n.ts` | Composes feature locales and handles detection |
| `apps/web/src/index.tsx` | Must import `./i18n` before `App` |
| `libs/features/settings/src/lib/components/GeneralTab.tsx` | Language picker and save action |
| `libs/features/onboarding/src/lib/components/CreateLenserProfileModal.tsx` | Initial language capture |
| `libs/features/auth/src/lib/context/AuthContext.tsx` | Persisted language and session metadata |
| `apps/docs/.vitepress/config.ts` | Optional docs locale config |

## Locale Bundle Contract

Use the feature's English locale module as the contract.
- Preserve the same keys and nesting.
- Keep interpolation markers unchanged.
- Keep plural and rich-text structure intact.
- Prefer natural language over literal translation.

## Runtime Flow

1. A feature exports its English and localized copy.
2. The forum app composes all feature bundles into one locale registry.
3. The selected code is saved and reused by settings, onboarding, and auth.
4. Docs locale wiring is only updated when docs are explicitly in scope.

## GRASP Notes

- Information Expert: each feature should own its own locale bundle.
- Controller: `apps/web/src/i18n.ts` should compose bundles, not store all
  copy itself.
- Low Coupling: feature libs should not know how other features load bundles.
- High Cohesion: one feature, one locale module tree, one preference flow.
- Protected Variations: change locale data in the owning feature, not in the
  app shell.

## Verification

Prefer the smallest useful checks:

```bash
pnpm nx run forum:build
pnpm nx run settings:test
pnpm nx run auth:test
```

If docs are included, run the docs build too.
