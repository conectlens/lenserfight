---
name: language-integrator
description: Add or localize LenserFight for a new language or locale. Use when asked to add, implement, port, or support translations for feature-owned locale bundles in libs/features, the forum app runtime locale controller, docs, or language preference flows.
---

# Language integrator

Use this skill to add a locale in the LenserFight Nx monorepo without spreading
language rules across unrelated files or putting i18n ownership in the app shell.

## Responsibility split

- `libs/features/*/src/lib/i18n/*.ts` owns translation bundles for each feature.
- `libs/features/settings` owns the language selector in the user settings flow.
- `libs/features/onboarding` owns the initial preferred-language capture.
- `libs/features/auth` owns preferred-language persistence and session data.
- `apps/web/src/i18n.ts` composes feature locale exports and handles runtime
  language detection.
- `apps/docs` is optional and only changes when docs localization is requested.

Use the same locale code everywhere. Do not invent a second translation system.

## Add a locale

1. Choose the locale code, display name, and text direction.
2. Add or update the locale bundle in the owning feature library under
   `libs/features/<feature>/src/lib/i18n/` so the feature remains the
   information expert for its own copy.
3. Export the locale from the feature library root.
4. Compose the new locale in `apps/web/src/i18n.ts`.
5. Update onboarding, settings, and auth language surfaces so they use the same
   locale code.
6. Update docs locale config only if docs are part of the request.

## File map

| File | Purpose |
| --- | --- |
| `libs/features/<feature>/src/lib/i18n/{LOCALE}.ts` | Feature locale bundle |
| `libs/features/<feature>/src/index.ts` | Re-export feature locale bundle |
| `apps/web/src/i18n.ts` | Runtime locale composition and detector |
| `apps/web/src/index.tsx` | Imports `./i18n` before `App` |
| `libs/features/settings/src/lib/components/GeneralTab.tsx` | Language selector and save flow |
| `libs/features/onboarding/src/lib/components/CreateLenserProfileModal.tsx` | Preferred-language capture |
| `libs/features/auth/src/lib/context/AuthContext.tsx` | Persisted language and session data |
| `apps/docs/.vitepress/config.ts` | Optional docs locale wiring |

## Bundle rules

- Use the feature's English locale module as the source of truth.
- Keep the key structure exactly the same.
- Do not rename keys or move them between sections.
- Preserve placeholders and interpolation markers exactly.
- Translate naturally instead of word-for-word.
- Keep locale metadata next to the feature bundle so the app can compose it
  without knowing translation internals.

## GRASP guidance

- Information Expert: each feature owns its own translated copy.
- Low Coupling: the forum app should compose feature locale exports, not own all
  strings directly.
- High Cohesion: one feature, one locale module tree, one responsibility.
- Protected Variations: keep user-facing language changes behind the feature
  locale exports so app composition stays thin.
- Controller: use `apps/web/src/i18n.ts` to coordinate locale selection, not
  the feature screens themselves.

## Verification

Use the smallest useful check set for the touched surface:

```bash
pnpm nx run forum:build
pnpm nx run settings:test
pnpm nx run auth:test
```

If the request touches docs, also validate the docs build.

## What not to do

- Do not recreate the old nested i18n layout in this repo.
- Do not split the same locale across multiple competing trees.
- Do not move locale ownership into the feature screens themselves.
- Do not move locale ownership back into `apps/web/src/locales`.
- Do not introduce `.yml` skill copies for this skill.
