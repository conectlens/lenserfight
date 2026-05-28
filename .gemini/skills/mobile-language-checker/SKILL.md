---
name: mobile-language-checker
description: Use when validating language preferences, locale resolution, onboarding localization, or in-app language settings across the current LenserFight file tree.
---

# Mobile Language Checker

Load `../mobile-ruleset/references/RULESET.md` first, then follow
`references/PREFERENCE_CHECKLIST.md`.

Use this skill to review or adjust language preference flows.

Focus on:
- `preferredLanguage` persistence and validation
- `apps/web/src/i18n.ts` locale registration and bootstrap
- `apps/web/src/locales/*.json` bundle consistency
- onboarding localization setup in `libs/features/onboarding`
- in-app language settings and selectors in `libs/features/settings`
- supported locale consistency between auth, onboarding, and forum i18n

After changes, verify the affected surface with the smallest useful Nx checks,
usually `pnpm nx run forum:build`, `pnpm nx run settings:test`, and
`pnpm nx run auth:test` if the change reaches app behavior.
