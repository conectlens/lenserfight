# Implementation Playbook

## Inspect First

- `apps/mobile/src/app/*`
- `apps/mobile/src/navigation/*`
- `apps/mobile/src/layouts/*`
- `apps/mobile/src/components/*`
- `apps/mobile/src/providers/*`
- `libs/ui/components/src/lib/*`
- `libs/ui/theme/src/lib/*`
- `libs/ui/tokens/src/lib/*`
- `libs/features/*`

## Read Before Editing

- `apps/mobile/README.md`
- `libs/ui/components/README.md`
- `libs/ui/theme/README.md`
- `apps/mobile/src/theme/tokens.ts`

## Implementation Order

1. Classify the change as shared UI, feature logic, or app composition.
2. Put shared contracts in the smallest reusable library owner.
3. Put rendering in the relevant `libs/ui/*` library.
4. Put composition and navigation in `apps/mobile/src/*`.
5. Use `libs/features/*` when logic is reused across screens or flows.

## GRASP Rules

- Tokens own visual definitions and semantic mapping.
- Primitives own rendering and platform-specific behavior.
- Composite components own orchestration only.
- Use `themeController.ts` or an equivalent controller for semantic roles.
- Use protected variations to hide web/native differences behind shared APIs.
- Keep coupling low and responsibilities narrow.

## Missing Component Rules

- Add standard components in `libs/ui` rather than local app copies.
- Define a shared prop contract first, then platform adapters.
- Export the shared contract from the package root.
- Keep accessibility, disabled state, loading state, and focus behavior aligned
  across platforms.
- Prefer composition over inheritance and avoid component-local visual constants.

## State and Accessibility

- Make states explicit: default, hover, focus-visible, pressed, selected,
  disabled, loading, success, warning, destructive.
- Keep text and icons on semantic tokens, not surface contrast assumptions.
- Support reduced-shadow and flat fallback modes.
- Respect keyboard, touch, and screen reader behavior on every surface.

## Platform Notes

- Web uses CSS box-shadow and semantic variables.
- Native uses shadow props and elevation approximations.
- Avoid DOM-only APIs in native exports.
- Avoid React Native primitives in web-only entrypoints.
- Document any platform-specific code introduced.

## Verification

- `pnpm nx run mobile:test`
- `pnpm nx run mobile:build`
- `pnpm nx run ui:lint`
- Use `pnpm nx affected -t lint,test,build` when the change touches shared UI.
