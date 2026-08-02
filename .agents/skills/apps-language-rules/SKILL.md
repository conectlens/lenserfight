---
name: apps-language-rules
description: Define i18n and internalization rules for forum (React/i18next) and docs (VitePress locales) apps. Use when adding new UI strings, translating docs, adding new locales, checking language consistency, or setting up hreflang SEO for multilingual pages.
---

# Apps Language Rules

## Use when
- Adding new UI strings to `apps/web` (must add to `en.json` + `tr.json` stubs)
- Writing new documentation pages (English first; Turkish stub in `docs/tr/` recommended)
- Adding a new locale beyond `en`/`tr`
- Checking consistency of translations across JSON catalogs
- Setting up `hreflang` SEO for multilingual pages
- Reviewing React components for hardcoded strings that bypass i18next

## Supported languages
| Code | Name | Default? | App locale files | Docs status |
|------|------|----------|-----------------|-------------|
| `en` | English | ✅ Yes | `en.json` | Complete |
| `tr` | Türkçe | No | `tr.json` | WIP |
| `es` | Español | No | not yet | Stub |
| `fr` | Français | No | not yet | Stub |
| `de` | Deutsch | No | not yet | Stub |
| `zh` | 中文 | No | not yet | Stub |
| `ja` | 日本語 | No | not yet | Stub |
| `ko` | 한국어 | No | not yet | Stub |
| `ru` | Русский | No | not yet | Stub |
| `pt` | Português | No | not yet | Stub |
| `it` | Italiano | No | not yet | Stub |

All codes are registered in `supabase/seeds/01_core_languages.sql` and configured as VitePress locales in `apps/docs/.vitepress/config.ts`. Adding app locale JSON files is the primary contribution needed.

---

## Forum i18n (`apps/web` — React + i18next)

### Setup
- i18next initialised in `apps/web/src/i18n.ts`
- Locale files: `apps/web/src/locales/en.json` and `apps/web/src/locales/tr.json`
- Imported at app entry (`apps/web/src/index.tsx`) before `<App />`
- Language detection order: `localStorage` (`lf-language` key) → browser navigator → html tag
- Fallback: English

### Rules for adding strings
1. Add key to `en.json` (English, authoritative).
2. Add **same key** to `tr.json` with Turkish translation or `""` placeholder.
3. Use `useTranslation()` hook in React components: `const { t } = useTranslation()`.
4. Never hardcode user-facing strings in JSX — always use `t('namespace.key')`.
5. Use interpolation for dynamic values: `t('prompts.usedTimes', { count: n })`.

### Key naming convention
```
<feature>.<subkey>
nav.home        → "Home" / "Ana Sayfa"
actions.copy    → "Copy" / "Kopyala"
prompts.title   → "Prompts" / "Promptlar"
errors.generic  → "Something went wrong." / "Bir hata oluştu."
```

### Language switcher
- Component: `libs/features/shell/src/lib/LanguageSwitcher.tsx`
- Placed in the forum `Header` (top-right action area)
- Calls `i18n.changeLanguage(code)` and updates `document.documentElement.lang`
- Language is persisted in `localStorage` under key `lf-language`

### SEO for forum (multilingual)
- `SEOHead.tsx` renders `<link rel="canonical">`, `og:locale`, and JSON-LD automatically
- `hreflang` alternates: include `?lang=tr` query param in alternates (no URL-prefix routing)
- `<html lang="">` is updated on language change by `LanguageSwitcher`
- `apps/web/public/sitemap.xml` includes `xhtml:link` hreflang alternates for static routes

---

## Docs i18n (`apps/docs` — VitePress locales)

### Setup
- VitePress `locales` config in `apps/docs/.vitepress/config.ts`
- Root locale: `en` (English) at `/`
- Turkish locale: `tr` at `/tr/`
- Language switcher is rendered automatically by VitePress in the top nav

### Rules for adding doc pages
1. Create English page at `docs/<section>/<slug>.md`.
2. Add it to `themeConfig.sidebar` in `config.ts` (English section).
3. Create Turkish stub at `docs/tr/<section>/<slug>.md` with frontmatter `lang: tr` and translation-pending notice.
4. Add Turkish sidebar entry to `locales.tr.themeConfig.sidebar` in `config.ts`.

### Turkish stub template
```markdown
---
lang: tr
title: <Turkish Title>
---

# <Turkish Title>

> Bu sayfa henüz tam olarak Türkçeye çevrilmemiştir. [İngilizce sürümünü görüntüle.](/<english-path>)

Bu belge yakında Türkçe olarak tam içerikle güncellenecektir.
```

### SEO for docs (multilingual)
- `hreflang` alternates are in the global `head` array in `config.ts`
- VitePress `cleanUrls: true` ensures canonical URLs without `.html`
- VitePress `sitemap` config auto-generates `sitemap.xml` at build time
- `robots.txt` at `apps/docs/public/robots.txt` references the sitemap

---

## Adding a new locale (beyond existing 11)

1. **Seed**: Add `('code', 'Name', 'NativeName', 'ltr', true)` to `supabase/seeds/01_core_languages.sql`.
2. **Arena**: Add `apps/arena/src/locales/<code>.json` mirroring `en.json`. Register in `apps/arena/src/i18n.ts`.
3. **Web**: Add `apps/web/src/locales/<code>.json` mirroring `en.json`. Register in `apps/web/src/i18n.ts`.
4. **Docs**: Add `<code>` entry to `locales{}` in `config.ts`. Create `docs/<code>/index.md` and `docs/<code>/tutorials/getting-started/overview.md`. Add `hreflang` to `head[]`. Update `inLanguage` in JSON-LD.
5. **Full step-by-step**: see `docs/how-to/contributors/i18n-guide.md` and `.claude/skills/language-integrator/SKILL.md`.

## Load only when needed
- [i18n and hreflang reference](references/REFERENCE.md)
