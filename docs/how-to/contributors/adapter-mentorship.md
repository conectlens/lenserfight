---
title: Adapter Mentorship Paths
description: First-adapter PR walkthrough plus the per-area mentor table for auth, providers, and scoring contributions.
---

# Adapter Mentorship Paths

Mentorship is how the LenserFight maintainers absorb new adapter contributors without each PR turning into a multi-week back-and-forth. Every area has a named mentor on rotation. Pinging them in your draft PR or in an exploratory issue is the supported path — there is no separate Discord triage queue.

For who is on rotation in any given week, see [Mentor Rotation](./mentor-rotation.md).

## First adapter PR walkthrough

This is the path for someone who has never opened a LenserFight PR. It is intentionally short — the goal is to get a draft PR up that a mentor can review, not to ship a finished adapter on the first attempt.

1. **Open an exploratory issue.** Use the [adapter idea](https://github.com/connectlens/lenserfight/issues/new?template=adapter_idea.yml) template. Capture the target service, the auth model, the scopes you think you'll need, and whether you intend to implement it yourself.
2. **Wait for an "approved" reply from a mentor (≤5 business days).** The mentor confirms the slug isn't taken, the scope set is reasonable, and the auth model has a precedent. If it doesn't, they will name what new ground the adapter would break and whether that is in scope for the current release.
3. **Fork and scaffold.** Follow [Connector SDK — Getting Started](./connector-sdk-getting-started.md) §1–§3. Stop at the first failing test rather than polishing the whole adapter; a draft PR with a scaffold and one passing `verify` test is enough to get review traction.
4. **Open a draft PR.** Title: `[draft] adapter: <slug>`. Reference the exploratory issue with `Closes #N`. The PR body should answer (a) what the adapter does, (b) what is unverified, (c) what feedback you want.
5. **Tag the area mentor.** Use the table below. The mentor commits to a first review within 7 business days of the draft going non-draft. If the draft remains a draft, the mentor responds asynchronously to specific questions only.
6. **Iterate to "ready for review".** Mentor + 1 community reviewer must approve before merge. The mentor may delegate the second sign-off if the adapter is straightforward.

## Mentors per area

| Area | Mentor handle | What they review |
|---|---|---|
| Auth — token verification, scope resolution, OAuth-like flows | `@maintainer-auth` | `verify(token)` correctness, scope mapping, refresh-token semantics |
| Providers — model dispatch, streaming, BYOK key handling | `@maintainer-providers` | `dispatch(event)` shape, retry-vs-no-retry boundary, streaming back-pressure, key resolution |
| Scoring — battle judges, evaluation plugins, signal recording | `@maintainer-scoring` | `ScoringPluginV1` conformance, signal naming, sandboxing, audit log writes |

Handles are placeholders during Limited Beta. The current rotation is published in [mentor-rotation.md](./mentor-rotation.md).

## What "out of scope" looks like

A mentor will close an exploratory issue without a "approved" reply when:

- The adapter requires a new top-level scope and the [v1 scope grammar](/reference/connectors/scopes) cannot accommodate it without a major bump. RFC required first.
- The auth model needs a per-user OAuth flow that LenserFight does not yet broker. Track in the connector roadmap, do not implement.
- The adapter would be the third reimplementation of an upstream service already covered by `examples/connectors/`.

Don't take this personally. It saves you from a long-running PR that cannot merge.

## Related

- [Adapter Contribution Guide](./adapter-contribution-guide.md) — full review process and PR labels.
- [Connector SDK — Getting Started](./connector-sdk-getting-started.md) — how to scaffold and register an adapter.
- [Mentor Rotation](./mentor-rotation.md) — current rotation and contact methods.
- [RFC-0001: Connector Interface](../../rfcs/RFC-0001-connector-interface.md) — interface stability rules.
