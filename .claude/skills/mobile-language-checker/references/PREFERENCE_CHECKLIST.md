# Preference Checklist

## Inspect first

- `apps/web/src/i18n.ts`
- `apps/web/src/locales/en.json`
- `apps/web/src/locales/tr.json`
- `apps/web/src/index.tsx`
- `libs/features/onboarding/src/lib/components/CreateLenserProfileModal.tsx`
- `libs/features/settings/src/lib/components/GeneralTab.tsx`
- `libs/features/auth/src/lib/context/AuthContext.tsx`

## Questions to answer

- Is `preferredLanguage` stored in a normalized supported locale format?
- Does the app fall back safely when the saved locale is missing or invalid?
- Do onboarding and settings use the same locale source of truth?
- Are locale-sensitive screens updated when the preference changes?
- Is the forum i18n bootstrap still the single source of truth?

## Report template

1. `Current behavior`
2. `Mismatch or risk`
3. `Recommended fix`
4. `Verification`
