---
title: Adding a New Language to LenserFight
description: Step-by-step playbook for promoting a stub locale into a shippable language across web, arena, docs, and the database.
---

# Adding a New Language to LenserFight

LenserFight already knows about 11 locales — see `libs/utils/locale/src/lib/locales.ts`. Most are still stubs (no UI strings, stub docs). This playbook walks through every change required to take a locale from stub → shippable.

The two enabled languages today are **English (`en`)** and **Turkish (`tr`)**. Use them as the references for everything below.

Pick a target locale code from the registry — for this guide we will use `de` (German). Replace `de` with your target.

---

## 1. Promote the locale in the registry

Edit `libs/utils/locale/src/lib/locales.ts`. Change the entry from `status: 'stub'` to `status: 'wip'`. Once translations are complete and reviewed by a native speaker, switch it to `'stable'`.

```ts
{ code: 'de', englishName: 'German', nativeName: 'Deutsch', direction: 'ltr', status: 'wip' },
```

`ENABLED_LOCALES` is automatically derived from `status !== 'stub'`, so the moment you flip to `wip` the new locale appears in every `LocaleSelect` and `LanguageSwitcher`. Make sure UI strings exist before you flip it.

---

## 2. Add UI strings

### apps/web

Create `apps/web/src/locales/de.json` by copying `en.json`. Translate every value. Preserve keys, `{{placeholder}}` markers, and nested namespaces exactly.

Register it in `apps/web/src/i18n.ts`:

```ts
import de from './locales/de.json'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
    de: { translation: de }, // new
  },
  // ...
})
```

### apps/arena

Same pattern. Copy `apps/arena/src/locales/en.json` → `de.json`, translate, then register in `apps/arena/src/i18n.ts`. Also translate the legal markdown under `apps/arena/src/locales/en/policies/` into `apps/arena/src/locales/de/policies/` — these are legal documents, so use a lawyer-grade translation or commission a review.

### apps/auth and apps/cli

These do not have i18n yet. If your locale needs them, contribute the i18next wiring first, then add the locale.

---

## 3. Add docs

VitePress uses route-prefixed locales (`/de/...`). At minimum the new locale needs a home page and a getting-started page.

### 3a. Create the locale root

```
docs/de/index.md
```

Use `docs/tr/index.md` as a template. Set `lang: de` in the frontmatter.

### 3b. Mirror the structure for translated pages

Each translated page must live at `docs/de/<same path as english>.md`. Untranslated pages can stay missing — VitePress falls back to English. If you want a soft fallback for a partially translated section, drop a WIP page with `[View English version.](/en/<path>)` at the top.

### 3c. Register in VitePress config

In `apps/docs/.vitepress/config.ts`:

```ts
locales: {
  // ... en, tr
  de: {
    label: 'Deutsch',
    lang: 'de',
    link: '/de/',
    title: 'LenserFight-Dokumentation',
    description: 'Die offene Arena der Köpfe.',
    // themeConfig optional — only needed once nav/sidebar exist
  },
},
```

Add the hreflang link in the `head` array:

```ts
['link', { rel: 'alternate', hreflang: 'de', href: `${DOCS_HOST}/de/` }],
```

Update the JSON-LD `inLanguage` field:

```ts
inLanguage: ['en', 'tr', 'de'],
```

### 3d. Mirror the contributor sidebar (optional but recommended)

If you intend to translate the contributor tree (`docs/de/how-to/contributors/...`), copy the Turkish contributor sidebar block in `apps/docs/.vitepress/config.ts` and replace `/tr/` with `/de/`. Even a 1-page stub here makes the locale feel real to new contributors.

---

## 4. Verify the database registry

`supabase/seeds/01_core_languages.sql` is the authoritative list. All locale codes used elsewhere must appear here. The 11 registered codes (en, tr, es, fr, de, zh, ja, ko, ru, pt, it) already cover the registry, so no SQL changes are usually needed. If you are adding a locale **outside** this list (e.g. `ar` Arabic), you must extend the SQL seed AND the registry in `libs/utils/locale/src/lib/locales.ts` simultaneously.

---

## 5. Verify

```bash
pnpm nx build web
pnpm nx build arena
pnpm nx build docs
pnpm nx test shared-i18n-locale
pnpm nx test shared-i18n-routing
pnpm nx test utils-locale
```

Manual smoke:

```bash
pnpm nx serve web
# Open the topbar LocaleSelect — your new locale appears.
# Switch to it. UI flips to your translations. Reload — still your locale.

pnpm nx serve arena
# Visit /de/. Layout renders. Switching back to /en/ updates the cookie.

pnpm nx serve docs
# Visit /de/. Home renders. /tutorials/getting-started/overview works
# (falls back to English if not translated).
```

---

## 6. Open the PR

Title pattern: `i18n(de): add German locale — wip`.

In the PR body, list:
- which surfaces are covered (web, arena, docs, policies)
- which surfaces are WIP / not yet translated
- which AI tool you used (if any) and whether a native speaker reviewed the strings

Do not flip the locale from `wip` → `stable` in the same PR that introduces it. Ship the strings first, let users surface issues, then promote in a follow-up PR.

---

## RTL languages

For Arabic, Hebrew, Persian, Urdu: the locale registry's `direction: 'rtl'` field is wired through `document.documentElement.dir` by the `LocaleProvider` in `libs/shared/i18n-locale/` and by `LocaleGuard` in `libs/shared/i18n-routing/`. You don't need to add directional overrides in components — Tailwind's RTL-aware utilities and the `dir` attribute handle it.

Test thoroughly: text alignment, icon mirroring, form layouts, and any custom CSS that uses `left/right` instead of `start/end`. Promoting an RTL locale from `wip` → `stable` should always include an RTL polish pass.
