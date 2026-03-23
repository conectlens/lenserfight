---
name: language-integrator
description: Add or localize lenserfight for a new language or locale. Use when asked to add, implement, port, or support translations for the forum app, docs, or language preference flows.
---

# Language integrator

Implement locale support for **$ARGUMENTS** across the current LenserFight file tree.

## Parse $ARGUMENTS

Derive three values from `$ARGUMENTS`:

| Value | Example (French) | Example (Arabic) |
|-------|-----------------|-----------------|
| `LOCALE` | `fr` | `ar` |
| `NAME` | `French` | `العربية` |
| `DIR` | `ltr` | `rtl` |

If `$ARGUMENTS` contains only a language name (e.g. "French"), infer `LOCALE` from ISO 639-1.
If `$ARGUMENTS` contains only a code (e.g. "fr"), infer `NAME` and `DIR`.
If both are provided (e.g. "Arabic RTL" or "ar Arabic"), use them directly.

## Architecture summary

```
apps/forum/
  src/i18n.ts         ← i18next bootstrap and supported locales
  src/locales/
    en.json           ← English messages
    tr.json           ← Turkish messages
    {LOCALE}.json     ← new locale bundle
  src/index.tsx       ← imports ./i18n before App

libs/features/settings/
  src/lib/components/GeneralTab.tsx   ← language selector + session locale sync

libs/features/onboarding/
  src/lib/components/CreateLenserProfileModal.tsx ← preferredLanguage capture

libs/features/auth/
  src/lib/context/AuthContext.tsx     ← preferred language persistence
```

## Procedure

### 1 — Update the forum locale bootstrap

Edit `apps/forum/src/i18n.ts`:
- add the new locale bundle import
- register the locale in `resources`
- add the locale code to `supportedLngs`
- keep the `lf-language` storage key stable unless there is a migration plan

### 2 — Add or translate forum locale bundles

Create `apps/forum/src/locales/{LOCALE}.json` from the English source bundle.
- Preserve key structure exactly.
- Translate user-facing strings naturally.
- Keep placeholders and ICU-style markers unchanged.
- Mirror the `en.json` shape exactly.

### 3 — Keep preference flows aligned

Update the settings and onboarding surfaces that set or consume language:
- `libs/features/settings/src/lib/components/GeneralTab.tsx`
- `libs/features/onboarding/src/lib/components/CreateLenserProfileModal.tsx`
- `libs/features/auth/src/lib/context/AuthContext.tsx`

Keep the preferred-language value normalized to the locale codes used by `apps/forum/src/i18n.ts`.

### 4 — Update docs locale wiring if needed

If the request also includes docs localization, update the VitePress locale config under `apps/docs/.vitepress/config.ts` and the matching `docs/` content tree.

### 5 — Translate with quality

- Use professional, context-aware translations.
- Prefer the most natural wording for the target locale.
- Preserve placeholders exactly.
- Match the key structure of the source bundle; never rename or add keys.
- For RTL languages (`dir: 'rtl'`), verify punctuation and sentence structure for RTL conventions.

### 6 — Verify

Prefer the smallest useful verification for the touched surface:

```bash
pnpm nx run forum:build
pnpm nx run forum:test
pnpm nx run settings:test
```

If the change touches the mobile language preference flow, also verify the mobile targets that consume the shared locale data.

## Gotchas

- Keep `apps/forum/src/i18n.ts` and `apps/forum/src/locales/*.json` in sync.
- Do not introduce a separate translation tree unless the repo already owns one.
- Keep the locale codes consistent between forum i18n, onboarding, settings, and auth persistence.
- Translation files are JSON bundles in this repo, not TypeScript objects.
