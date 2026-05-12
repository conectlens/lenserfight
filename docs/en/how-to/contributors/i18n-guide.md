---
title: Internationalization (i18n) Contribution Guide
description: How to add or improve translations for LenserFight apps, docs, and the database seed.
---

# Internationalization (i18n) Contribution Guide

LenserFight is a global arena. The core platform is English-first, but every surface is designed for translation. This guide tells you exactly where to add strings, which files to change, and how to verify your work.

## Supported languages

| Code | Language | Native Name | Direction | Docs status |
|:-----|:---------|:------------|:----------|:------------|
| `en` | English | English | ltr | Complete |
| `tr` | Turkish | Türkçe | ltr | WIP |
| `es` | Spanish | Español | ltr | Stub |
| `fr` | French | Français | ltr | Stub |
| `de` | German | Deutsch | ltr | Stub |
| `zh` | Chinese | 中文 | ltr | Stub |
| `ja` | Japanese | 日本語 | ltr | Stub |
| `ko` | Korean | 한국어 | ltr | Stub |
| `ru` | Russian | Русский | ltr | Stub |
| `pt` | Portuguese | Português | ltr | Stub |
| `it` | Italian | Italiano | ltr | Stub |
| `ar` | Arabic | العربية | **rtl** | Stub |

The database seed (`supabase/seeds/01_core_languages.sql`) is the authoritative registry of supported language codes. All app-level locale files must use codes from that list.

---

## File structure

```
apps/
  arena/src/locales/
    en.json                 ← English strings for the public arena
    tr.json                 ← Turkish strings for the public arena
    {locale}.json           ← Add new locale here
    en/policies/            ← Legal docs in English (markdown)
    tr/policies/            ← Legal docs in Turkish (markdown)
    {locale}/policies/      ← Add legal docs for new locale here

  web/src/locales/
    en.json                 ← English strings for the main web app
    tr.json                 ← Turkish strings for the main web app
    {locale}.json           ← Add new locale here

  auth/src/locales/         ← Auth app (no i18n yet — contribute here!)
    en.json                 ← Create this if it doesn't exist
    {locale}.json           ← Mirror en.json structure

  cli/src/locales/          ← CLI (no i18n yet — contribute here!)
    en.json                 ← Create this if it doesn't exist
    {locale}.json           ← Mirror en.json structure

  docs/
    tutorials/ how-to/ reference/ explanation/ ...   ← English docs
    tr/                     ← Turkish docs (mirrors English structure)
    es/ fr/ de/ zh/ ja/ ko/ ru/ pt/ it/              ← WIP stubs

apps/docs/.vitepress/config.ts   ← VitePress locale config (hreflang + nav)

supabase/seeds/
  01_core_languages.sql     ← Authoritative language registry
```

---

## How to add a new locale to an app

### 1 — apps/arena and apps/web (i18next)

Both use i18next with JSON locale files loaded directly in `i18n.ts`.

**Step 1.** Copy `apps/arena/src/locales/en.json` to `apps/arena/src/locales/{locale}.json`. Translate every value. Do not change keys.

**Step 2.** Import and register in `apps/arena/src/i18n.ts`:
```ts
import {locale} from './locales/{locale}.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: '{locale}', label: '{NativeName}' }, // ← add here
] as const

i18n.init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
    {locale}: { translation: {locale} }, // ← add here
  },
  supportedLngs: ['en', 'tr', '{locale}'], // ← add here
  ...
})
```

Repeat the same pattern for `apps/web/src/i18n.ts`.

### 2 — apps/arena legal/policy markdown

Copy `apps/arena/src/locales/en/policies/` to `apps/arena/src/locales/{locale}/policies/`. Translate each `.md` file with legal-level precision. Preserve markdown structure and heading levels exactly.

### 3 — apps/auth

Auth has no i18n yet. To add it:
1. Create `apps/auth/src/locales/en.json` with all visible strings.
2. Add i18next following the same pattern as `apps/arena/src/i18n.ts`.
3. Add `{locale}.json` with translations.

### 4 — apps/cli

CLI has no i18n yet. It uses hardcoded English strings. To add it:
1. Extract all user-visible strings to `apps/cli/src/locales/en.json`.
2. Wire i18next or a lightweight equivalent.
3. Add `{locale}.json`.

---

## How to add a new locale to docs (VitePress)

Docs live in `docs/` and are served by VitePress via `apps/docs/.vitepress/config.ts`.

### Step 1 — Create the locale root

```
docs/{locale}/index.md
```

Use the existing `docs/tr/index.md` as a template. Set `lang: {locale}` in frontmatter and include a translation note pointing to the English version.

### Step 2 — Create the getting-started stub

```
docs/{locale}/tutorials/getting-started/overview.md
```

Minimum content:
```yaml
---
lang: {locale}
title: {Translated title}
---

# {Translated title}

> {Note that this page is a WIP — link to English version}

{2-3 sentences in the target language describing LenserFight}

**{Translated call-to-action to help translate}** → [i18n guide](/en/how-to/contributors/i18n-guide)
```

### Step 3 — Mirror English structure for translated pages

Each translated page must mirror its English counterpart at `docs/{locale}/{same/path}.md`. Required frontmatter:
```yaml
---
lang: {locale}
title: {Translated title}
---
```

Untranslated stubs must include a fallback note:
- English fallback link pattern: `[View English version.](/{english-path})`

### Step 4 — Register in VitePress config

In `apps/docs/.vitepress/config.ts`:

**Add hreflang** (in the `head` array, before `x-default`):
```ts
['link', { rel: 'alternate', hreflang: '{locale}', href: `${DOCS_HOST}/{locale}/` }],
```

**Add locale entry** (in the `locales` object, after `tr`):
```ts
{locale}: {
  label: '{NativeName}',
  lang: '{locale}',
  link: '/{locale}/',
  title: '{Translated site title}',
  description: '{Translated site description}',
},
```

When the locale has enough content to warrant a sidebar and nav, add `themeConfig` following the `tr` locale pattern.

**Update JSON-LD** `inLanguage` array:
```ts
inLanguage: ['en', 'tr', '{locale}'],
```

---

## How to use AI tools to translate

LenserFight encourages AI-assisted translation. Here is the recommended workflow:

1. **Copy** the English file verbatim.
2. **Prompt** your AI tool:
   > Translate this LenserFight documentation page from English to {language}. Preserve all markdown formatting, frontmatter keys, code blocks, and `{{placeholder}}` interpolation markers exactly. Use natural, professional wording — not a word-for-word literal translation.
3. **Review** as a native speaker. Fix idioms, punctuation, and cultural nuances.
4. **Submit** a PR with the translated file(s).

For legal/policy text, use lawyer-level precision. Do not simplify.

For RTL languages (Arabic, Hebrew, Persian, Urdu): text direction is handled by the `dir` attribute in VitePress. You only need to write the translated text — do not add directional overrides.

---

## Verifying your work

```bash
# Check that the docs build cleanly
pnpm nx run docs:build

# Serve locally and review the locale at /{locale}/
pnpm nx run docs:serve
```

Open `http://localhost:5173/{locale}/` to verify:
- The home hero renders correctly
- The language picker shows your locale
- Fallback links to English work

---

## Quick reference: what needs translating

| Surface | File(s) | Status |
|:--------|:--------|:-------|
| Arena UI strings | `apps/arena/src/locales/` | `en` + `tr` done |
| Arena legal policies | `apps/arena/src/locales/{locale}/policies/` | `en` + `tr` done |
| Web app UI strings | `apps/web/src/locales/` | `en` + `tr` done |
| Auth app | `apps/auth/src/locales/` | Not started |
| CLI | `apps/cli/src/locales/` | Not started |
| Docs pages | `docs/{locale}/` | Turkish WIP; 9 other stubs |
| Database language registry | `supabase/seeds/01_core_languages.sql` | Complete (11 locales) |

---

## Opening a PR

1. Branch from `development`.
2. Add only translation files — do not mix feature code with i18n.
3. Title: `i18n({locale}): translate {surface} to {Language}`.
4. In the PR body, note which AI tool you used (if any) and whether a native speaker reviewed the output.

Questions? Open a [GitHub Discussion](https://github.com/conectlens/lenserfight/discussions) with the `i18n` label.
