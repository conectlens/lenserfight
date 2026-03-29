---
name: auth-performance
description: Fix startup and session performance in apps/auth, including profile bootstrap, session hydration, repeated auth fetches, and unnecessary render waterfalls.
---

# Auth Performance

## Rules

- App bootstrap must not fan out into repeated profile/session reads.
- Load only the fields needed to decide navigation and identity state.
- Defer non-critical profile enrichment.
- Avoid duplicate auth listeners and duplicate bootstrap fetches.

## Gotchas

- Auth pages feel small, but repeated session/profile fetches can block the whole shell.
- Do not fetch large profile-related joins during login or startup.