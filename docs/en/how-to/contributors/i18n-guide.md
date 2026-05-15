---
title: Internationalization (i18n) Contribution Guide
description: How LenserFight resolves, persists, and exposes locale across apps/web (cookie-driven), apps/arena (URL-prefix), and apps/docs (VitePress).
---

# Internationalization (i18n) Contribution Guide

LenserFight is English-first but every surface is built for translation. The platform now ships **two locale strategies** and a shared cookie that lets a language chosen anywhere follow the user across apps. This guide tells contributors which strategy applies where, how to add a string, and where to look first when locale state misbehaves.

If you want to **add a brand-new language**, jump to [Adding a Language](./adding-a-language.md). Read on if you are extracting strings, fixing a locale bug, or learning the architecture.

---

## Architecture in one diagram

```
                    +-------------------------------+
                    |  lensers.preferences.language |  (Supabase, authenticated users)
                    +---------------+---------------+
                                    |
                                    v
+--------------+   reads/writes    +-----------+   reads/writes    +-------------+
|  apps/web    | <===============> |  shared   | <===============> |  apps/docs  |
| (cookie /    |   lf-locale       |  cookie   |   lf-locale       | (VitePress) |
|  no URL      |                   | on parent |                   |             |
|  prefix)     |                   |   domain  |                   |             |
+--------------+                   +-----+-----+                   +-------------+
                                         ^
                                         | reads/writes
                                         v
                                  +--------------+
                                  |  apps/arena  |
                                  | (URL-prefix  |
                                  |  /:lang/...) |
                                  +--------------+
```

- `apps/web` is route-stable — there are no `/en/...` URLs. Locale is resolved from auth → cookie → localStorage → navigator → default.
- `apps/arena` keeps its `/en/`, `/tr/` URL prefixes for SEO/hreflang. It writes the cookie when the user switches.
- `apps/docs` (VitePress) keeps `/en/`, `/tr/` prefixes but redirects bare paths using the cookie value, and writes the cookie on every locale-prefixed page load.

The cookie name is `lf-locale`, scoped to the parent domain (`.lenserfight.com` in prod, `localhost` locally). Attributes: `Path=/`, `SameSite=Lax`, `Secure` on HTTPS, `Max-Age=1y`.

---

## Resolution priority (apps/web)

Implemented in [`libs/shared/i18n-locale/src/lib/resolver.ts`](https://github.com/conectlens/lenserfight/blob/main/libs/shared/i18n-locale/src/lib/resolver.ts).

1. Authenticated user — `lenser.preferences.language` from `useLenser()`.
2. Shared cookie — `lf-locale` on the parent domain.
3. Legacy localStorage — `lf-language` (kept for back-compat with arena).
4. Browser — `navigator.language` short code.
5. Default — `en`.

The first match that is **enabled** in `@lenserfight/utils/locale` wins. Unknown / disabled values fall through.

On every change, the provider writes cookie + localStorage + `i18next.changeLanguage` + DOM `lang` + DOM `dir`. When the change came from a user interaction and the user is signed in, the new value is also written to `lensers.preferences.language` through `preferencesService.updatePreferences`.

---

## Where to find the moving parts

| Surface | Path |
|:---|:---|
| Locale registry (11 langs, en+tr enabled) | `libs/utils/locale/src/lib/locales.ts` |
| Cookie-driven provider (apps/web) | `libs/shared/i18n-locale/` |
| URL-prefix provider (apps/arena, apps/docs) | `libs/shared/i18n-routing/` |
| Auth bridge (apps/web) | `apps/web/src/locale/LocaleProviderBridge.tsx` |
| i18next bootstrap (apps/web) | `apps/web/src/i18n.ts` |
| i18next bootstrap (apps/arena) | `apps/arena/src/i18n.ts` |
| VitePress locale config | `apps/docs/.vitepress/config.ts` |
| VitePress cookie hook | `apps/docs/.vitepress/theme/index.ts` |
| English UI strings (web) | `apps/web/src/locales/en.json` |
| English UI strings (arena) | `apps/arena/src/locales/en.json` |
| English docs | `docs/en/` |
| Turkish docs | `docs/tr/` |
| Database language registry | `supabase/seeds/01_core_languages.sql` |

---

## Extracting a hardcoded string in apps/web

1. Open the component. Identify the user-visible string.
2. Add a key under a meaningful namespace in `apps/web/src/locales/en.json`. Use dot-namespaced keys (`auth.notAuthorized.title`, not flat `notAuthorizedTitle`).
3. Add the same key with a Turkish value in `apps/web/src/locales/tr.json`. Even a rough translation is fine — leave a `# WIP` comment in the PR description if so.
4. Replace the literal with `t('namespace.key')`:

   ```tsx
   const { t } = useTranslation()
   return <h1>{t('auth.notAuthorized.title')}</h1>
   ```

5. Verify in the browser: the string flips when you switch languages via the topbar `LocaleSelect`. No reload required.

Three reference refactors live in the tree as examples — `apps/web/src/NotAuthorizedPage.tsx`, `libs/features/settings/src/lib/components/GeneralTab.tsx`, and `libs/features/home/src/lib/pages/HomePage.tsx`.

---

## Extracting a hardcoded string in apps/arena

Same pattern, but the file lives at `apps/arena/src/locales/en.json` and the locale is bound to the URL via `:lang` rather than the cookie. The arena `LanguageSwitcher` also writes the cross-app cookie, so a switch in arena is visible to web/docs on the next visit.

---

## When should I pick which strategy?

| You're building... | Use |
|:---|:---|
| A new screen in `apps/web` or a `libs/features/*` slice consumed by web | `useTranslation()` + `useLocale()` from `@lenserfight/shared/i18n-locale` |
| A new landing/marketing page in `apps/arena` | `useTranslation()` + `useLocale()` from `@lenserfight/shared/i18n-routing` |
| A new docs page | Add the file to both `docs/en/...` and `docs/tr/...` (Turkish can be a WIP stub) |
| A locale-aware link inside arena/docs | `<LocaleLink>` from `@lenserfight/shared/i18n-routing` |
| A locale-aware action inside web (cookie-driven) | `useLocale().setLocale(...)` from `@lenserfight/shared/i18n-locale` |

Do not import `@lenserfight/shared/i18n-locale` from arena/docs code, or `@lenserfight/shared/i18n-routing` from web code. The two libs intentionally diverge on URL semantics; mixing them creates undefined behavior.

---

## Verifying your change

```bash
pnpm nx test shared-i18n-locale
pnpm nx test shared-i18n-routing
pnpm nx build web
pnpm nx build arena
pnpm nx build docs
```

Manual smoke (apps/web):

```bash
pnpm nx serve web
```

1. Anonymous: clear cookies → visit `/home` → English. Cookie `lf-locale=en` is written.
2. Switch via topbar → Turkish. Reload → still Turkish.
3. Sign in with a profile whose `preferences.language='tr'` while cookie says `en` → app boots in Turkish, cookie is rewritten to `tr`.
4. Cross-app: visit `/tr/about` in arena → cookie becomes `tr` → opening `apps/web` afterwards loads in Turkish.

---

## Opening a PR

1. Branch from `development`.
2. Keep the PR scoped — pure string extractions, not mixed with feature changes.
3. Title format: `i18n: extract <surface> strings` or `i18n(<locale>): translate <surface>`.
4. In the PR body, name the AI tool you used (if any) and whether a native speaker reviewed the output.

Questions? Open a [GitHub Discussion](https://github.com/conectlens/lenserfight/discussions) with the `i18n` label.
