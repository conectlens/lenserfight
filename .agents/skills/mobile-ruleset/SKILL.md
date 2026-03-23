---
name: mobile-ruleset
description: Shared mobile workspace rules for apps/mobile and libs/* in lenserfight. Use when navigating native UI boundaries, shared tokens, verification defaults, or the canonical mobile design ruleset.
---

# Mobile Ruleset

Use this as the canonical baseline for every mobile skill. Read
`references/RULESET.md` first for workspace rules, shared vocabulary, and Soft
UI guidance.

This is the source of truth for mobile UI/UX rules in `.agents` and `.claude`.
The `mobil-ui-ux-ruleset` folder is a compatibility alias only.

Focus on:
- `apps/mobile` as the app shell and composition layer
- `libs/ui/components` and `libs/ui/theme` as the shared UI source of truth
- `libs/ui/tokens` as the shared token source of truth
- `libs/features/*` as reusable feature logic and feature UI
- `libs/domain/*` and `libs/shared/*` as shared contracts and rules
- tokens and semantic contracts before component styling
- iOS and Android as related but distinct platform passes
- Soft UI / Neumorphism as a token-driven visual language
- shared components that keep `libs/*` and `apps/*` aligned
- smallest-useful Nx verification after mobile or shared UI changes
