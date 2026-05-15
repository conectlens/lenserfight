# i18n & hreflang Reference

## i18next key design
- Keys are dot-namespaced: `feature.action` or `feature.subfeature.label`
- English values are authoritative — Turkish translations may lag
- Missing Turkish key falls back to English automatically (i18next `fallbackLng: 'en'`)
- Pluralisation: use `_one` / `_other` suffixes or i18next count interpolation

## hreflang rules
- Include `x-default` pointing to the canonical English URL
- `hreflang` applies to pages, not just the domain root
- Use absolute URLs (not relative) in `href`
- For query-param-based language switching: `https://lenserfight.com/?lang=tr`
- For path-based (VitePress docs): `https://docs.lenserfight.com/tr/`

## When NOT to translate
- Technical terms (LLM, prompt, API, CLI, XP) — keep in English in all locales
- Code examples — always in English
- Error message codes — English only
- Brand names: LenserFight, Lenser, ConectLens — never translate

## VitePress locale config shape
```ts
locales: {
  root: { label: 'English', lang: 'en' },
  tr: {
    label: 'Türkçe', lang: 'tr', link: '/tr/',
    title: '...',
    themeConfig: { nav: [...], sidebar: [...] }
  }
}
```

## i18next React usage
```tsx
// In a component:
import { useTranslation } from 'react-i18next'
import { Button } from '@lenserfight/ui/components'
const { t } = useTranslation()
<Button>{t('actions.save')}</Button>
<p>{t('prompts.usedTimes', { count: 42 })}</p>

// Changing language:
import i18n from '../i18n'
i18n.changeLanguage('tr')
```

## Checklist for new locale
- [ ] JSON catalog added to `src/locales/<code>.json`
- [ ] Resource registered in `i18n.ts`
- [ ] Language added to `LANGUAGES` in `LanguageSwitcher.tsx`
- [ ] VitePress `locales.<code>` entry added to `config.ts`
- [ ] `docs/<code>/` directory created with stubs
- [ ] `hreflang` added to VitePress `head` and forum `sitemap.xml`
- [ ] `<html lang>` updates verified for new locale
