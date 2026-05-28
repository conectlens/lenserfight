---
name: ui-contract-guard
description: Guard shared UI contracts across web and mobile in lenserfight. Use when editing libs/ui, shared components, design tokens, hooks, or platform-specific entrypoints such as index.ts and index.native.ts.
disable-model-invocation: true
---
# UI Contract Guard

Use this skill before changing shared UI.

## What to protect

- Shared component APIs should remain stable and predictable.
- `libs/ui/components/src/index.ts` and `libs/ui/theme/src/index.ts` must expose
  platform-safe surfaces.
- Design tokens and contracts should be centralized, not redefined in apps.
- Do not let domain logic or network code leak into shared UI components.

## Review Sequence

1. Inspect current exports and consumers.
2. Separate visual primitives from app-specific compositions.
3. Confirm whether a change is web-only, native-only, or shared.
4. Prefer prop/API refinement over duplicating similar components.
5. Call out breaking API changes explicitly.

## Heuristics

- Shared if semantics and lifecycle match across apps/platforms.
- App-local if wording, layout, or data dependencies are product-specific.
- Native/web split if implementation differs but the conceptual contract is the
  same.

Load only when needed:
- Shared UI notes: [platform rules](references/platform-rules.md)
