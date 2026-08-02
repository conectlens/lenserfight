---
name: language-integrator
description: Add or localize LenserFight for a new language or locale. Use when asked to add, implement, port, or support translations — for example "add French", "support Arabic", or "translate to German" — even if the user never says "i18n", "locale", or "translation". $ARGUMENTS is the target language, locale code, or combined hint, such as "French", "fr", "Arabic RTL", or "es Spanish".
---

# Language Integrator

Implement full i18n support for **$ARGUMENTS** across the LenserFight monorepo.

## Parse $ARGUMENTS

Derive three values from `$ARGUMENTS`:

| Value | Example (French) | Example (Arabic) |
|-------|-----------------|-----------------|
| `LOCALE` | `fr` | `ar` |
| `NAME` | `Français` | `العربية` |
| `DIR` | `ltr` | `rtl` |

If `$ARGUMENTS` contains only a language name (e.g. "French"), infer `LOCALE` from ISO 639-1.
If `$ARGUMENTS` contains only a code (e.g. "fr"), infer `NAME` and `DIR`.
RTL languages: Arabic (`ar`), Hebrew (`he`), Persian (`fa`), Urdu (`ur`).

## Architecture summary

```
apps/arena/src/
  i18n.ts                        ← SUPPORTED_LANGUAGES + init — register here
  locales/
    en.json                      ← English source of truth
    LOCALE.json                  ← create: mirror en.json, translate all values
    en/policies/                 ← English legal markdown
    LOCALE/policies/             ← create: translated legal markdown (if applicable)

apps/web/src/
  i18n.ts                        ← SUPPORTED_LANGUAGES + init — register here
  locales/
    en.json                      ← English source of truth
    LOCALE.json                  ← create: mirror en.json, translate all values

apps/docs/.vitepress/config.ts   ← add hreflang entry + locales entry

docs/
  LOCALE/
    index.md                     ← create: VitePress locale home (hero in native lang)
    tutorials/getting-started/
      overview.md                ← create: getting-started stub with English fallback link

supabase/seeds/01_core_languages.sql  ← authoritative language registry — add if missing
```

Auth (`apps/auth`) and CLI (`apps/cli`) have no i18n infrastructure yet.
If the request targets those surfaces, read [REFERENCE.md](references/REFERENCE.md) for the scaffold templates.

## Procedure

### 1 — Verify language registry

Read `supabase/seeds/01_core_languages.sql`.
If `LOCALE` is missing, add inside the `VALUES (...)` block:
```sql
('LOCALE', 'NAME_EN', 'NAME', 'DIR', true),
```

### 2 — Translate arena locale file

Read `apps/arena/src/locales/en.json` in full.
Create `apps/arena/src/locales/LOCALE.json` mirroring every key. Translate all values.
Do not rename or add keys. Preserve `{{placeholder}}` markers exactly.

Register in `apps/arena/src/i18n.ts`:
```ts
import LOCALE from './locales/LOCALE.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'LOCALE', label: 'NAME' }, // ← add
] as const

i18n.init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
    LOCALE: { translation: LOCALE }, // ← add
  },
  supportedLngs: ['en', 'tr', 'LOCALE'], // ← add
  ...
})
```

### 3 — Translate web locale file

Read `apps/web/src/locales/en.json` in full.
Create `apps/web/src/locales/LOCALE.json` using the same rules as step 2.
Register in `apps/web/src/i18n.ts` following the identical pattern.

### 4 — Translate arena legal policies (if applicable)

Copy `apps/arena/src/locales/en/policies/` structure to `apps/arena/src/locales/LOCALE/policies/`.
Translate each `.md` file with legal-level precision. Preserve markdown structure exactly.

### 5 — Create docs locale root

Create `docs/LOCALE/index.md` using `docs/tr/index.md` as the structural reference:
```yaml
---
lang: LOCALE
title: {Translated "LenserFight Documentation"}
layout: home

hero:
  name: LenserFight
  text: "{Translated tagline}"
  tagline: "{Translated sub-tagline}"
  actions:
    - theme: brand
      text: {Translated "Get Started"}
      link: /LOCALE/tutorials/getting-started/overview
    - theme: alt
      text: GitHub
      link: https://github.com/conectlens/lenserfight
---

> {Translation note in LOCALE language — include link to English version}
```

### 6 — Create getting-started stub

Create `docs/LOCALE/tutorials/getting-started/overview.md`:
```yaml
---
lang: LOCALE
title: {Translated "Overview"}
---

# {Translated "Overview"}

> {Note that page is WIP — link to /tutorials/getting-started/overview}

{2–3 sentences about LenserFight in LOCALE}

**{Call-to-action for native speakers}** → [i18n guide](/how-to/contributors/i18n-guide)
```

### 7 — Register in VitePress config

In `apps/docs/.vitepress/config.ts`:

**Add hreflang** in `head[]`, before `x-default`:
```ts
['link', { rel: 'alternate', hreflang: 'LOCALE', href: `${DOCS_HOST}/LOCALE/` }],
```

**Add locale** in `locales{}`, after `tr`:
```ts
LOCALE: {
  label: 'NAME',
  lang: 'LOCALE',
  link: '/LOCALE/',
  title: '{Translated site title}',
  description: '{Translated description}',
},
```

**Update JSON-LD** `inLanguage` array to include `'LOCALE'`.

When the locale has enough content, add `themeConfig` with `nav` and `sidebar` following the `tr` locale as reference.

### 8 — Translation quality rules

- Natural wording over word-for-word. Use the most idiomatic phrasing for the locale.
- Preserve `{{placeholder}}` interpolation markers exactly.
- RTL: write text with RTL conventions. VitePress handles layout via `dir` — no extra code.
- Legal/policy markdown: lawyer-level precision; never simplify or summarize.

### 9 — Verify

```bash
pnpm nx run docs:build
pnpm nx run docs:serve
# Open http://localhost:5173/LOCALE/ — verify hero and language picker
```

## Gotchas

- **JSON key names are sacred.** Never rename, remove, or add keys vs. `en.json`.
- **`SUPPORTED_LANGUAGES` is a `const` tuple** — TypeScript infers the union from it; adding a code without the array entry causes downstream type errors.
- **Docs locale pages must mirror English paths.** `docs/LOCALE/tutorials/getting-started/overview.md` maps to `/LOCALE/tutorials/getting-started/overview`.
- **Stub pages require a fallback link** to the English counterpart.
- **`01_core_languages.sql` is the authoritative registry.** Every locale code used anywhere must appear there.
- **Auth and CLI have no i18n yet.** If scaffolding them, read [REFERENCE.md](references/REFERENCE.md) first.
