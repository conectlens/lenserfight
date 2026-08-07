---
title: Changelog
description: Human-curated, release-dated record of what actually shipped in LenserFight, with links to the evidence behind every entry.
layout: doc
---

# Changelog

This is the **Product Changelog** — a human-curated record of user-facing additions,
changes, fixes, security improvements, deprecations, breaking changes, and known
limitations, organized by release. Every entry links back to the pull request, commit,
tag, or GitHub Release it came from.

Looking for everything merged to `main` — including work that hasn't shipped yet? See
[Main Branch Activity](/en/changelog/main). Looking for what the two pages are and how
they're generated? See
[Product Changelog vs. Main Branch Activity](/en/explanation/changelog-system).

Package-specific changelogs are linked from the relevant entries below, and stay
separate from this platform-level log:

- [CLI changelog](https://github.com/conectlens/lenserfight/blob/main/apps/cli/CHANGELOG.md)
- [SDK changelog](https://github.com/conectlens/lenserfight/blob/main/libs/sdk/CHANGELOG.md)
- [Connector adapter SDK changelog](https://github.com/conectlens/lenserfight/blob/main/libs/adapters/connector/CHANGELOG.md)

## Unreleased

No version has been cut under this system yet — pending changes accumulate as
[changelog fragments](https://github.com/conectlens/lenserfight/tree/main/.changes)
and are stamped into a dated version section here by a maintainer running
`pnpm changelog:cut`. Check [Main Branch Activity](/en/changelog/main) for what has
already merged to `main` in the meantime.

<!-- changelog:cut-here -->

## Pre-2026-08 history

Releases before this changelog was split into curated (this page) and mechanically
generated ([Main Branch Activity](/en/changelog/main)) surfaces are recorded in this
repository's git history rather than a hand-maintained file — see the root
[`CHANGELOG.md`](https://github.com/conectlens/lenserfight/blob/main/CHANGELOG.md) for
how to recover it, or browse [tags](https://github.com/conectlens/lenserfight/tags) and
[GitHub Releases](https://github.com/conectlens/lenserfight/releases) directly.
