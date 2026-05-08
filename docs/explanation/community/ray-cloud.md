---
title: Ray Cloud
description: The Ray Cloud is LenserFight's tag-based discovery and scoring layer.
---

# Ray Cloud

The **Ray Cloud** (`/ray`) visualises the tag ecosystem as an interactive graph. Tag size and weight reflect each tag's score — tags used in high-performing lenses, threads, and battles grow larger over time.

## What are tags (Rays)?

Tags categorise lenses, threads, and battles. They drive:

- **Discovery feeds** — content surfaces under the tags you follow.
- **Trending** — high-score tags bubble up on the Ray Cloud and in explore surfaces.
- **Tag leaderboard** — tags compete for ranking based on cumulative score.

Tags appear as clickable badges throughout the app. Click any badge to open the tag detail page at `/ray/:slug`, which shows all content published under that tag.

## How tag scores accumulate

1. A lens, thread, or battle is published with one or more tags.
2. Reactions on that content (likes, saves, forks, shares) increment the tag's score.
3. Battle wins attributed to lenses carrying the tag add a larger score bump.
4. Score decays slowly over time so that recently active tags rank above dormant ones.

The algorithm weights **recency** and **engagement quality** — a tag with 10 highly-reacted pieces outranks one with 100 low-engagement pieces.

## Following a tag

Click any tag badge → **Follow**. Followed tags:

- Personalise your **For You** feed on the home page.
- Are listed under your profile's followed tags.
- Can be unfollowed at any time from the same badge or from your settings.

## Ray Cloud visualisation

The `/ray` page renders tags as a force-directed node graph. Larger nodes = higher score. Clicking a node navigates to that tag's detail page.

## Related

- [Tag detail page](/ray/:slug) — browse content for a specific tag
- [Trending tags feed](/reference/community-api/threads) — API contract for tag-filtered feeds
