---
name: docs-publication-manager
description: Create or refine compact technical documentation, READMEs, public docs, and contribution guides. Use for OSS-facing docs, internal docs cleanup, navigation design, converting implementation details into concise Claude-style markdown, and multilingual documentation (English + Turkish).
---

# Docs Publication Manager

## Use when
- README or docs structure needs improvement
- Internal knowledge must be turned into compact public docs
- The repo needs clearer onboarding or contribution guidance
- A new doc page needs to be added for English and/or Turkish
- Translated (Turkish) stubs need to be filled in or checked

## Workflow
1. Identify audience, document goal, and missing information.
2. Produce concise, navigable markdown with minimal redundancy.
3. Return document structure, edits, and follow-up gaps.
4. For new pages: create English first, then Turkish stub in `docs/tr/<same/path>.md`.
5. For Turkish pages: verify frontmatter has `lang: tr` and a link back to the English version.

## Language rules

### Default language: English
- All documentation **must** be written in English first.
- English docs live at `docs/<section>/<slug>.md`.
- VitePress serves English at `/` (root locale).

### Turkish (`/tr/`) docs
- Turkish docs live at `docs/tr/<section>/<slug>.md` — mirrors the English structure exactly.
- VitePress `locales.tr` serves them at `/tr/<section>/<slug>`.
- Every Turkish page **must** include:
  ```yaml
  ---
  lang: tr
  title: <Turkish title>
  ---
  ```
- Stubs that are not yet translated must contain a blockquote linking to the English version:
  ```md
  > Bu sayfa henüz tam olarak Türkçeye çevrilmemiştir. [İngilizce sürümünü görüntüle.](/<english-path>)
  ```
- Do not write inaccurate or machine-translated content — use stubs until a human translation is ready.

### Sidebar / nav updates
- When adding a new English page, add it to the `sidebar` array in `apps/docs/.vitepress/config.ts` under the correct English section.
- Also add the corresponding entry to `locales.tr.themeConfig.sidebar` with the `/tr/` prefix and a Turkish label.
- Nav links in the Turkish locale must point to `/tr/<path>`.

### SEO for multilingual docs
- `hreflang` alternates are configured globally in `config.ts` head.
- Per-page canonical is handled by VitePress automatically when `cleanUrls: true` is set.
- For new languages beyond `en`/`tr`: add to `locales` in `config.ts`, add `hreflang` in `head`, create `docs/<lang>/` directory.

## Load only when needed
- [Doc style guide](references/REFERENCE.md)
- [README template](assets/readme-template.md)
- [Doc outline template](assets/doc-outline-template.md)
