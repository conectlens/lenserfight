# Mobile Ruleset

## Workspace Truth

- `apps/mobile` is the Expo / React Native app.
- `libs/ui/components` and `libs/ui/theme` are the shared UI source of truth.
- `libs/ui/tokens` owns color, radius, spacing, and elevation tokens.
- `libs/features/*` contains reusable feature logic and feature UI.
- `libs/domain/*` contains domain rules and shared contracts.
- `libs/utils/*` contains technical helpers with no app ownership.
- `libs/infra/*` contains integration adapters.
- Do not invent `packages/*` or `.mobile.ts` paths in this repo.

## Shared UI Source of Truth

- Prefer `libs/ui/components/src/index.ts` for shared component exports.
- Prefer `libs/ui/theme/src/index.ts` and `libs/ui/tokens/src/index.ts` for theme
  and palette decisions.
- Keep app-specific composition in `apps/mobile/src/*`.
- Keep new shared UI in `libs/ui` rather than copying it into the app.
- Use mature, secure, sector-standard native libraries when they clearly improve
  mobile performance or maintainability.

## Shared Vocabulary

- `apps/mobile`: Expo / React Native application shell.
- `libs/ui/components`: shared UI source of truth.
- `libs/features/*`: reusable feature logic and feature UI.
- `libs/domain/*`: shared domain contracts and rules.
- `libs/utils/*`: technical helpers with no app ownership.
- `token`: a raw visual value such as color, radius, spacing, or elevation.
- `semantic token`: a role-based mapping such as surface, overlay, or pressed.
- `primitive`: a low-level renderer with minimal behavior.
- `composite`: a composed component that orchestrates primitives.
- `controller`: a central resolver that maps semantic intent to token values.
- `indirection`: the layer that hides platform-specific differences.
- `protected variation`: web/native divergence that stays behind a shared API.
- `raised`: the default elevated state.
- `inset`: the pressed or active state.
- `flat`: the fallback state for accessibility or density.
- `dual shadow`: a light highlight plus a dark shadow on the same surface.
- `single light source`: one global direction, usually top-left.
- `same-family surface`: the parent and child share the same base surface tone.
- `default`, `hover`, `focus-visible`, `pressed`, `selected`, `disabled`,
  `loading`, `success`, `warning`, `destructive`: the standard state set.
- `composition over inheritance`: assemble behavior instead of subclassing it.
- `low coupling`: keep contracts small and stable.
- `information expert`: the owner of the data or rule should define it.
- `single source of truth`: do not duplicate tokens or rules in app code.

## Soft UI Rules

- Apply the dual-shadow principle to every elevated surface.
- Keep the surface color aligned with the parent surface family.
- Limit depth to `raised`, `inset`, and `flat`.
- Derive shadows from tokens only: `tokens/elevation.ts` and semantic maps.
- Treat `interactive.default` as `raised` and `interactive.active` as `inset`.
- Use a single top-left light source across the whole system.
- Avoid stacked elevation; soft UI breaks when layers pile up.
- Keep borders minimal and rely on light/shadow separation first.

## GRASP and OOAD

- Tokens own visual definitions.
- Primitives own rendering behavior.
- Composite components own orchestration only.
- Use `design-contract.ts` or an equivalent controller to resolve semantic roles.
- Use indirection to map semantic states like `surface`, `interactive`, `pressed`,
  `focus`, `disabled`, `overlay`, and feedback states to token values.
- Use protected variations for web CSS shadows and native shadow/elevation
  approximations.
- Prefer composition over inheritance and keep responsibilities narrow.

## Interaction and Accessibility

- Make the state model explicit: default, hover, focus-visible, pressed, selected,
  disabled, loading, success, warning, destructive.
- Provide a flat or reduced-shadow fallback for accessibility and high-density UI.
- Support high-contrast overrides without rewriting component APIs.
- Keep text and icon colors on semantic tokens, not surface contrast guesses.
- Keep keyboard, screen reader, and touch interactions aligned across platforms.

## Verification Defaults

- `pnpm nx run mobile:test`
- `pnpm nx run mobile:build`
- `pnpm nx run ui:lint`
- Use `pnpm nx affected -t lint,test,build` for broader shared UI work.
