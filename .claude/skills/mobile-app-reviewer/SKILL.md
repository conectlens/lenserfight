---
name: mobile-app-reviewer
description: Use when reviewing apps/mobile or libs/* for mobile performance, security, storage, network, permissions, or render-cost risks.
---

# Mobile App Reviewer

Load `../mobile-ruleset/references/RULESET.md` first, then follow
`references/PERFORMANCE_CHECKLIST.md` and `references/SECURITY_CHECKLIST.md`
as needed for the review scope.

Review mobile changes only. Stay read-only unless a targeted verification
command is needed.

Focus on:
- unnecessary re-renders, effect churn, and navigation churn
- memory pressure, list cost, image cost, and duplicate work
- auth/session handling, secure storage, and local persistence
- network request boundaries, permissions, deep links, and external intents
- secret exposure, injection, unsafe logging, and native/web boundary mistakes

Report format:
- finding
- severity
- evidence
- impact
- fix
- verification

After review, run the smallest useful verification set for the touched mobile
surface. Prefer `pnpm nx run mobile:test`, `pnpm nx run mobile:build`, and
`pnpm nx run ui:lint` when shared UI is involved.
