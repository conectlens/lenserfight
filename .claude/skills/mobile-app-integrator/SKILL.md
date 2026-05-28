---
name: mobile-app-integrator
description: Use when implementing new mobile features in apps/mobile or libs/* with Expo/React Native and the shared mobile design system.
---

# Mobile App Integrator

Load `../mobile-ruleset/references/RULESET.md` first, then follow
`references/IMPLEMENTATION_PLAYBOOK.md`.

Implement mobile features only. Prefer shared code where it keeps the app
consistent and maintainable.

Focus on:
- `apps/mobile` feature work and screen composition
- shared UI and domain reuse in `libs/*`
- mobile navigation, providers, guards, and theme wiring
- reading repo docs before editing
- production-minded implementation over quick ad hoc fixes

Workflow:
- inspect the relevant mobile docs and existing patterns first
- choose the lowest-level library that fits the behavior
- keep app code in `apps/mobile` and reusable code in `libs/*`
- avoid web-only or desktop-only assumptions

After implementation, verify with targeted Nx checks. Prefer
`pnpm nx run mobile:test`, `pnpm nx run mobile:build`, and `pnpm nx run ui:lint`
when shared UI changes are involved.
