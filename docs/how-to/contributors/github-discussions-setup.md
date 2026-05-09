---
title: GitHub Discussions Setup
description: How to configure GitHub Discussions categories for the LenserFight community — canonical category names, purposes, and moderation settings.
---

# GitHub Discussions Setup

This document is a one-time operator reference for configuring GitHub Discussions on the `conectlens/lenserfight` repository. It also explains to contributors what each category is for.

## Canonical categories

| Category | Emoji | Format | Purpose |
|----------|-------|--------|---------|
| Announcements | 📣 | Announcement | Maintainer-only posts: releases, RFCs, breaking changes |
| Q&A | ❓ | Question / Answer | Architecture questions, usage help, "should I build X" checks |
| Show & Tell | 🌟 | Open | Share your lenses, battles, connectors, and results |
| Ideas | 💡 | Open | Feature requests and product direction proposals |
| Lens of the Week | 🏆 | Open | Weekly featured lens thread; maintainer-pinned |
| Incident Retros | 🔥 | Open | Post-incident write-ups (P0/P1 only) |
| Contributors | 🛠️ | Open | Contributor coordination, PR pairing, review requests |

## Setup steps (for repo admins)

1. Go to **Settings → Features → Discussions** and enable Discussions.
2. Click **Discussions** tab → **Categories** (gear icon).
3. Create each category above with the listed emoji and format.
4. For **Announcements**: set "Only maintainers and admins can post" to `true`.
5. For **Q&A**: enable the "Mark as answer" feature.
6. Pin a welcome post in **Q&A** with links to: [Finding Work](/how-to/contributors/finding-work), [Contributing](/how-to/contributors/contributing), [Security](/how-to/contributors/security).

## Moderation settings

- Close and lock any discussions that migrate to GitHub Issues.
- Move questions posted in Issues to **Q&A** Discussions (use the "Convert to Discussion" button).
- The **Lens of the Week** thread should be opened every Monday by the maintainer and closed the following Monday. Reference `pnpm sync-mentor-handles` for the rotation schedule.

## What belongs where

| User wants to… | Direct them to… |
|----------------|----------------|
| Report a bug | [GitHub Issues](https://github.com/conectlens/lenserfight/issues) |
| Ask "how does X work?" | Discussions → Q&A |
| Propose a new feature | Discussions → Ideas |
| Show off a lens or battle result | Discussions → Show & Tell |
| Coordinate on a PR | Discussions → Contributors |
| Report a security issue | security@lenserfight.com (never public) |

## Community health signals to watch

After the OSS announcement, track these weekly in Discussions → Announcements:
- Q&A threads opened vs. answered (target: > 80% answered within 48h)
- Ideas with ≥ 5 upvotes (candidates for the roadmap)
- Show & Tell posts (signals adoption and usage diversity)

## Short link

`/r/discussions` → `https://github.com/conectlens/lenserfight/discussions`

Add this to `tools/gen-shortlinks.mjs` if not already present.
