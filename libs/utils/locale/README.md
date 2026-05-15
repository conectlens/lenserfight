# util-locale

Framework-free locale registry and path helpers shared across LenserFight apps.

## Adding a locale

Locale codes are sourced from `supabase/seeds/01_core_languages.sql`. Never invent
new codes — mirror existing entries. To enable a stub locale:

1. Flip its `status` from `'stub'` to `'wip'` (or `'stable'`) in
   `src/lib/locales.ts`.
2. Add the matching translations in the consuming app's locale JSON / markdown
   trees.
3. Run the parity spec: `pnpm nx test util-locale`.

## Deferred locales

The Supabase seed contains four codes not declared here:

- `ar` — RTL stub; enabling it requires a Tailwind logical-properties pass.
- `zh-CN`, `zh-TW` — regional Chinese variants; `zh` is the present default.

Add them with `status: 'stub'` (or `'wip'` with translation work) when needed.

## Running unit tests

`pnpm nx test util-locale`
