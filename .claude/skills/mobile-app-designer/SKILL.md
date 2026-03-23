---
name: mobile-app-designer
description: Use when designing or refining Expo Go React Native screens in apps/mobile, with separate iOS and Android considerations, to keep the UI minimalist, performant, and aligned with the shared native design system.
---

# Mobile App Designer

Load `../mobile-ruleset/references/RULESET.md` first, then follow
`references/DESIGN_GUIDELINES.md`.

Design for `apps/mobile` only. Treat iOS and Android as related but distinct
platforms, and evaluate both before deciding on interaction, spacing,
navigation, or component choices.

Focus on:
- sector-standard mobile patterns for iOS and Android separately
- the app's default palette and theme tokens
- shared secure, sector-standard native primitives from `libs/ui/components`
- theme and token wiring from `libs/ui/theme` and `libs/ui/tokens`
- the real mobile product tree, especially Chao Chat, Chao features,
  project management, notifications, CRON jobs, and settings
- consistent spacing, typography, and surface hierarchy
- simple, predictable interactions over novelty

Rules:
- keep all mobile screens feeling like one product
- prefer shared primitives and mature native libraries over custom one-off
  components when they improve security or performance
- use the existing palette before introducing new colors
- preserve the app-specific feature tree; do not mirror forum pages into
  mobile one-for-one
- avoid decorative complexity unless it improves clarity
- keep mobile work centered on mobile-first flows, not desktop parity

After design work, verify with the smallest useful mobile test set. Prefer
`pnpm nx run mobile:test`, `pnpm nx run mobile:build`, and `pnpm nx run ui:lint`
when shared UI is touched.
