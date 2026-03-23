# Language Integrator Reference

## File Tree

| File | Purpose |
| --- | --- |
| `apps/forum/src/i18n.ts` | Edit — register supported locales and bundles |
| `apps/forum/src/locales/en.json` | Source English bundle |
| `apps/forum/src/locales/tr.json` | Existing Turkish bundle |
| `apps/forum/src/locales/{LOCALE}.json` | Create — new locale bundle |
| `apps/forum/src/index.tsx` | Ensure `./i18n` is imported before `App` |
| `libs/features/settings/src/lib/components/GeneralTab.tsx` | Edit — keep the language selector aligned |
| `libs/features/onboarding/src/lib/components/CreateLenserProfileModal.tsx` | Edit — keep preferredLanguage capture aligned |
| `libs/features/auth/src/lib/context/AuthContext.tsx` | Edit — keep persisted language aligned |
| `apps/docs/.vitepress/config.ts` | Optional — docs locale wiring |

## Bundle Template

Use the `apps/forum/src/locales/en.json` key structure as the source of truth.
- Preserve nesting and key names exactly.
- Keep placeholders and interpolation markers untouched.
- Keep translated strings natural and idiomatic.

## Locale Bootstrap

`apps/forum/src/i18n.ts` owns the runtime locale list.
- Add every new locale bundle there.
- Keep the storage key stable unless migration work is included.
- Keep `supportedLngs` aligned with the bundle files.

## Preference Flow

The language preference flows through:
- onboarding capture
- auth persistence
- settings UI
- forum locale bootstrap

Those surfaces must stay on the same normalized locale codes.

## Verification

Prefer the smallest useful checks for the touched surface.

```bash
pnpm nx run forum:build
pnpm nx run settings:test
pnpm nx run auth:test
```
