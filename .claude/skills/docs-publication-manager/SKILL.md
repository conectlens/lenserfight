---
name: docs-publication-manager
description: Create or refine compact technical documentation, READMEs, public docs, and contribution guides. Use for OSS-facing docs, internal docs cleanup, navigation design, converting implementation details into concise Claude-style markdown, and multilingual documentation (English + 10 WIP languages).
---

# Docs Publication Manager

## Use when
- README or docs structure needs improvement
- Internal knowledge must be turned into compact public docs
- The repo needs clearer onboarding or contribution guidance
- A new doc page needs to be added for English and/or any supported locale
- Translated stubs need to be filled in or checked

## Workflow
1. Identify audience, document goal, and missing information.
2. Produce concise, navigable markdown with minimal redundancy.
3. Return document structure, edits, and follow-up gaps.
4. For new pages: create English first, then create stubs for any locales where the English page is marked stable.
5. For any locale page: verify frontmatter `lang` is set and a fallback link to English exists.

## Language rules

### Default language: English
- All documentation **must** be written in English first.
- English docs live at `docs/<section>/<slug>.md`.
- VitePress serves English at `/` (root locale).

### Supported locales

| Code | Label | Status | Root |
|------|-------|--------|------|
| `en` | English | Complete | `docs/` |
| `tr` | Türkçe | WIP | `docs/tr/` |
| `es` | Español | Stub | `docs/es/` |
| `fr` | Français | Stub | `docs/fr/` |
| `de` | Deutsch | Stub | `docs/de/` |
| `zh` | 中文 | Stub | `docs/zh/` |
| `ja` | 日本語 | Stub | `docs/ja/` |
| `ko` | 한국어 | Stub | `docs/ko/` |
| `ru` | Русский | Stub | `docs/ru/` |
| `pt` | Português | Stub | `docs/pt/` |
| `it` | Italiano | Stub | `docs/it/` |

### Page rules for every locale
- Mirror the English path exactly: `docs/{locale}/{same/path}.md`
- Required frontmatter: `lang: {locale}` and `title: {translated title}`
- Stubs must contain a blockquote linking to the English version
- Do not write inaccurate or machine-translated content — use stubs until a reviewer approves
- Stub pattern (adapt wording to the target language):
  ```md
  > This page has not yet been translated. [View the English version.](/<english-path>)
  ```

### Turkish (`/tr/`) — additional rules
- Stubs use: `> Bu sayfa henüz tam olarak Türkçeye çevrilmemiştir. [İngilizce sürümünü görüntüle.](/<english-path>)`

### Sidebar / nav updates
- When adding a new English page, add it to the `sidebar` array in `apps/docs/.vitepress/config.ts`.
- Also add the corresponding entry to `locales.tr.themeConfig.sidebar` with `/tr/` prefix.
- WIP stub locales (es/fr/de/zh/ja/ko/ru/pt/it) do not have a sidebar in config yet — add `themeConfig` only when the locale has enough content to warrant it.
- Nav links in any locale must use the `/{locale}/` prefix.

### SEO for multilingual docs
- `hreflang` alternates are configured globally in `config.ts` head — all 11 locales are registered.
- Per-page canonical is handled by VitePress automatically when `cleanUrls: true`.
- Adding a new locale beyond the current 11: add to `locales{}`, add `hreflang` in `head[]`, update `inLanguage` in JSON-LD, create `docs/{locale}/` root files, add to `supabase/seeds/01_core_languages.sql`.

### Full i18n contribution guide
For detailed step-by-step instructions covering app locale files (arena, web, auth, cli), see:
`docs/how-to/contributors/i18n-guide.md`

## Load only when needed
- [Doc style guide](references/REFERENCE.md)
- [README template](assets/readme-template.md)
- [Doc outline template](assets/doc-outline-template.md)
