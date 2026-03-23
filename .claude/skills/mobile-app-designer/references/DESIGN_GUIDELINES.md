# Design Guidelines

## Inspect First

- `apps/mobile/src/theme/tokens.ts`
- `apps/mobile/src/theme/navigationTheme.ts`
- `apps/mobile/src/ui/primitives/*`
- `libs/ui/components/src/lib/*`
- `libs/ui/theme/src/lib/*`
- `libs/ui/tokens/src/lib/*`
- `libs/ui/forms/src/lib/*`
- `libs/ui/layout/src/lib/*`
- `libs/ui/modals/src/lib/*`

## Design System Responsibilities

- Tokens own visual definitions and platform-neutral values.
- Primitives own rendering and platform-specific behavior.
- Composites own orchestration and state composition only.
- `libs/ui/theme/src/lib/themeController.ts` or an equivalent controller resolves semantic roles.
- Use indirection to map roles like `surface`, `interactive`, `pressed`,
  `focus`, `disabled`, `overlay`, and feedback states.
- Use protected variations for CSS box-shadow on web and shadow/elevation
  approximations on native.

## Soft UI Rules

- Use the dual-shadow principle for every elevated surface.
- Keep the surface color aligned with the parent surface family.
- Limit depth to `raised`, `inset`, and `flat`.
- Derive colors, radii, spacing, and elevation from tokens only.
- No hardcoded shadows, no ad hoc color literals, no local elevation scales.
- Keep a single light source direction across the system.
- Avoid stacked elevation and extra border noise.
- Make the state change obvious: `raised -> inset` on press, `inset -> raised`
  on release.

## Component Inventory

- Buttons, Button Group, Close Button
- Accordion, Collapse, Card, Carousel, List Group
- Alert, Badge, Breadcrumb, Navs and Tabs, Navbar, Pagination, Scrollspy
- Dropdowns, Modal, Offcanvas, Popovers, Tooltips
- Progress, Spinners, Toasts
- Plus every component already present in `libs/ui`

## Responsibility Boundaries

- Keep primitives focused on one rendering job.
- Keep stateful orchestration out of primitives unless it is intrinsic to the
  control.
- Prefer composition over inheritance for variants and layouts.
- Keep accessibility helpers shared when the same rules repeat.
- Do not let domain logic or network behavior leak into UI components.

## Accessibility and Interaction

- Explicit states: default, hover, focus-visible, pressed, selected, disabled,
  loading, success, warning, destructive.
- Support reduced-shadow and flat-fallback modes.
- Keep text and icon contrast on semantic tokens, not guessed surface contrast.
- Preserve keyboard navigation, focus visibility, and touch target sizing.
- Keep motion subtle and optional; respect reduced-motion settings.

## File Placement

- `libs/ui/tokens/src/lib/*`: color, radius, spacing, elevation, semantic mapping.
- `libs/ui/components/src/lib/*`: shared UI primitives and composed components.
- `libs/ui/theme/src/lib/*`: theme controller and context wiring.
- `libs/ui/forms/src/lib/*`: form-specific shared components.
- `libs/ui/layout/src/lib/*`: layout-specific shared components.
- `libs/ui/modals/src/lib/*`: modal-specific shared components.

## Report Template

1. What changed
2. Why it fits the mobile system
3. Consistency risks
4. Verification
