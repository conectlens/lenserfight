# Arena Locales

Modular, namespace-based translation files for `apps/arena`.

## Structure

```
locales/
├── en/              ← Source of truth (English)
│   ├── common.json  ← Shared CTAs, badges, labels
│   ├── nav.json     ← Header, footer, mobile menu
│   ├── seo.json     ← Meta titles + descriptions
│   ├── home.json    ← LandHomePage
│   ├── about.json   ← AboutPage
│   ├── product.json ← ProductPage
│   ├── cli.json     ← CLIPage + CLIQuickstartPage
│   ├── demo.json    ← DemoPage
│   ├── faq.json     ← FAQPage
│   ├── getStarted.json ← GetStartedPage
│   ├── founderNote.json ← FounderNotePage
│   ├── battleShowcase.json ← BattleShowcasePage
│   ├── mobile.json  ← MobileComingSoonPage
│   ├── gamification.json ← GamificationPreview
│   ├── forms.json   ← WaitlistForm, validation
│   └── policies/    ← Markdown policy docs
├── tr/              ← Turkish translations
│   └── (mirror of en/)
```

## Usage

```tsx
// Page component
const { t } = useTranslation('home')
<h1>{t('hero.headline')}</h1>

// Cross-namespace reference
const { t } = useTranslation('common')
<button>{t('cta.enterArena')}</button>

// Multiple namespaces
const { t } = useTranslation(['home', 'common'])
<h1>{t('home:hero.headline')}</h1>
<button>{t('common:cta.enterArena')}</button>
```

## Key Naming

```
{section}.{subsection}.{element}
```

- Max depth: 4 levels
- Use camelCase for keys
- Array items: use indexed keys (`bullets.0`, `bullets.1`)
- Interpolation: `{{variable}}` syntax

## Adding a New Key

1. Add the key to `en/{namespace}.json`
2. Add the Turkish translation to `tr/{namespace}.json`
3. Use `t('key')` in the component

## Adding a New Namespace

1. Create `en/{namespace}.json` and `tr/{namespace}.json`
2. Add imports to `apps/arena/src/i18n.ts`
3. Add namespace name to `ARENA_NAMESPACES` array
4. Add to both `en` and `tr` resource objects

## Adding a New Locale

1. Copy the `en/` folder to `{locale}/`
2. Translate all JSON files
3. Add imports to `apps/arena/src/i18n.ts`
4. Add locale resource object

## Brand Terms (Never Translate)

- LenserFight, Lenser, Lens, Battle, Arena, Dukkan, Chainabit, ConnectLens
