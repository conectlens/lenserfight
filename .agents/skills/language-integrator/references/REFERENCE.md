# Language Integrator — Reference

Detailed templates, checklists, and conventions for the LenserFight monorepo. Replace `LOCALE` with the ISO 639-1 code (e.g. `fr`), `NAME` with the native display name (e.g. `Français`), `DIR` with `ltr` or `rtl`.

---

## File inventory checklist

Every new locale requires changes or additions to these files:

| File | Action |
|------|--------|
| `supabase/seeds/01_core_languages.sql` | Edit — add `('LOCALE', ...)` if missing |
| `apps/arena/src/locales/LOCALE.json` | Create — mirror `en.json`, translate all values |
| `apps/arena/src/i18n.ts` | Edit — add to `SUPPORTED_LANGUAGES`, `resources`, `supportedLngs` |
| `apps/web/src/locales/LOCALE.json` | Create — mirror `en.json`, translate all values |
| `apps/web/src/i18n.ts` | Edit — add to `SUPPORTED_LANGUAGES`, `resources`, `supportedLngs` |
| `docs/LOCALE/index.md` | Create — VitePress locale home page |
| `docs/LOCALE/tutorials/getting-started/overview.md` | Create — getting-started stub |
| `apps/docs/.vitepress/config.ts` → `head[]` | Edit — add hreflang |
| `apps/docs/.vitepress/config.ts` → `locales{}` | Edit — add locale entry |
| `apps/docs/.vitepress/config.ts` → JSON-LD `inLanguage` | Edit — add locale code |

Optional (if legal content is requested):

| File | Action |
|------|--------|
| `apps/arena/src/locales/LOCALE/policies/terms.md` | Create |
| `apps/arena/src/locales/LOCALE/policies/privacy.md` | Create |
| `apps/arena/src/locales/LOCALE/policies/cookies.md` | Create |
| `apps/arena/src/locales/LOCALE/policies/acceptable-use.md` | Create |

---

## i18n.ts registration template

Applies to both `apps/arena/src/i18n.ts` and `apps/web/src/i18n.ts`:

```ts
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import tr from './locales/tr.json'
import LOCALE from './locales/LOCALE.json' // ← add

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'LOCALE', label: 'NAME' }, // ← add
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
      LOCALE: { translation: LOCALE }, // ← add
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'tr', 'LOCALE'], // ← add
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lf-language',
    },
    interpolation: { escapeValue: false },
  })
```

---

## VitePress config patches

### hreflang (in `head[]`)

Insert before the `x-default` entry:
```ts
['link', { rel: 'alternate', hreflang: 'LOCALE', href: `${DOCS_HOST}/LOCALE/` }],
```

Complete block with all current supported locales:
```ts
['link', { rel: 'alternate', hreflang: 'en', href: DOCS_HOST }],
['link', { rel: 'alternate', hreflang: 'tr', href: `${DOCS_HOST}/tr/` }],
['link', { rel: 'alternate', hreflang: 'es', href: `${DOCS_HOST}/es/` }],
['link', { rel: 'alternate', hreflang: 'fr', href: `${DOCS_HOST}/fr/` }],
['link', { rel: 'alternate', hreflang: 'de', href: `${DOCS_HOST}/de/` }],
['link', { rel: 'alternate', hreflang: 'zh', href: `${DOCS_HOST}/zh/` }],
['link', { rel: 'alternate', hreflang: 'ja', href: `${DOCS_HOST}/ja/` }],
['link', { rel: 'alternate', hreflang: 'ko', href: `${DOCS_HOST}/ko/` }],
['link', { rel: 'alternate', hreflang: 'ru', href: `${DOCS_HOST}/ru/` }],
['link', { rel: 'alternate', hreflang: 'pt', href: `${DOCS_HOST}/pt/` }],
['link', { rel: 'alternate', hreflang: 'it', href: `${DOCS_HOST}/it/` }],
['link', { rel: 'alternate', hreflang: 'x-default', href: DOCS_HOST }],
```

### Locale entry (in `locales{}`)

Minimal entry for a WIP locale (add after `tr` block):
```ts
LOCALE: {
  label: 'NAME',
  lang: 'LOCALE',
  link: '/LOCALE/',
  title: '{Translated site title}',
  description: '{Translated description}',
},
```

Full entry with nav (for locales with sufficient content):
```ts
LOCALE: {
  label: 'NAME',
  lang: 'LOCALE',
  link: '/LOCALE/',
  title: '{Translated site title}',
  description: '{Translated description}',
  themeConfig: {
    nav: [
      { text: '↗ Arena', link: 'https://lenserfight.com' },
      { text: '{Translated Tutorials}', link: '/LOCALE/tutorials/getting-started/overview' },
    ],
    sidebar: {
      '/LOCALE/tutorials/': [
        {
          text: '{Translated Getting Started}',
          items: [
            { text: '{Translated Overview}', link: '/LOCALE/tutorials/getting-started/overview' },
          ],
        },
      ],
    },
  },
},
```

### JSON-LD `inLanguage`

```ts
inLanguage: ['en', 'tr', 'LOCALE'],
```

---

## Docs page templates

### Locale home (`docs/LOCALE/index.md`)

```markdown
<!-- TR_GATE: Only translate after English equivalent is marked stable -->
---
lang: LOCALE
title: {Translated "LenserFight Documentation"}
layout: home

hero:
  name: LenserFight
  text: "{Translated tagline}"
  tagline: {Translated sub-tagline}
  actions:
    - theme: brand
      text: {Translated "Get Started"}
      link: /LOCALE/tutorials/getting-started/overview
    - theme: alt
      text: GitHub
      link: https://github.com/conectlens/lenserfight
---

> {Translation note in native language — link to English fallback}
```

### Getting-started stub (`docs/LOCALE/tutorials/getting-started/overview.md`)

```markdown
---
lang: LOCALE
title: {Translated "Overview"}
---

# {Translated "Overview"}

> {Note that page is a stub — link to /tutorials/getting-started/overview}

{2–3 sentences about LenserFight in native language}

**{Call-to-action for native speakers}** → [i18n guide](/how-to/contributors/i18n-guide)
```

---

## Auth scaffold (if requested)

Auth has no i18n infrastructure yet. To add it:

1. Create `apps/auth/src/locales/en.json` with every user-visible string.
2. Add dependencies if missing: `pnpm add i18next react-i18next i18next-browser-languagedetector --filter auth`
3. Create `apps/auth/src/i18n.ts` following the same pattern as `apps/web/src/i18n.ts`.
4. Import `./i18n` in `apps/auth/src/main.tsx` before the React tree renders.
5. Create `apps/auth/src/locales/LOCALE.json` with translations.

---

## CLI scaffold (if requested)

CLI has no i18n infrastructure yet. To add it:

1. Identify all user-visible strings in `apps/cli/src/commands/` and `apps/cli/src/utils/`.
2. Extract to `apps/cli/src/locales/en.json`.
3. Use `i18next` with Node.js backend, or a lightweight key-value lookup.
4. Wire locale detection from `--lang` flag or `LF_LANG` env var.
5. Create `apps/cli/src/locales/LOCALE.json` with translations.

---

## RTL checklist

For Arabic (`ar`), Hebrew (`he`), Persian (`fa`), Urdu (`ur`):

- [ ] `direction` field is `rtl` in `supabase/seeds/01_core_languages.sql`.
- [ ] `label` in `SUPPORTED_LANGUAGES` uses the native name.
- [ ] Docs `index.md` hero text follows RTL sentence structure.
- [ ] JSON locale values use RTL punctuation: Arabic comma `،`, question mark `؟`.
- [ ] `{{placeholder}}` markers remain byte-for-byte identical regardless of RTL context.
- [ ] Visual browser review after `pnpm nx run docs:serve` — VitePress handles `dir` attribute; text quality requires human eyes.

---

## PR title convention

```
i18n(LOCALE): translate {surface} to {Language}
```

Examples:
- `i18n(fr): translate arena UI to French`
- `i18n(ar): add Arabic legal policies`
- `i18n(de): create docs getting-started stub`

---

## Original mental model (retained for reference)

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
