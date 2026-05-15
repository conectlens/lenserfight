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

Tags appear as clickable badges throughout the app. Click any badge to open that tag's detail page, which shows all content published under it.

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

## Language-based suggestions

Every Lens and Thread is stored with a `language_code` (ISO 639-1, default `en`). Each lenser profile holds a preferred language in their settings. These two values interact across all discovery surfaces to surface relevant-language content first.

### How your language preference is set

Go to **Settings → Language** to change your preferred language. The value is stored in `lensers.preferences.language` and used automatically in every personalised feed.

### Trending feeds (global)

The trending Lenses and Threads feeds accept an optional `lang` filter. When a language is specified, content whose `language_code` matches receives a **1.5× multiplier** applied to its raw `hot_score` before ranking:

```
ranked_score = hot_score × (language_code = p_lang ? 1.5 : 1.0)
```

This does not hide non-matching content — it promotes matching content within the same ranked list.

### Personalised feeds (For You)

The **For You** feed computes a `personal_score` from four weighted signals:

| Signal | Weight | Source |
|--------|--------|--------|
| Tag interest (followed tags) | 0.30 | `lensers.tag_follows` |
| Language match | 0.25 | `lensers.preferences.language` vs `entity_translations.language_code` |
| Author follow | 0.25 | `lensers.relationships` |
| Reaction recency | 0.20 | `content.reactions` |

Language contributes 0.25 out of 1.0, so it meaningfully shapes ranking but does not dominate over tag interest or social graph.

### Tag search and tag cloud

Tag search (`fn_tags_search`) and the tag stats list (`list_tags_stats`) both accept a `lang` parameter (default `en`). Results are joined to `content.tag_translations` by `language_code`, so tag names and descriptions are returned in your language when a translation exists, falling back to the original language otherwise.

The Ray Cloud visualisation at `/ray` inherits the same language-aware tag data — node labels render in your locale when a translation is available.

### Lens and Thread language at publish time

When a Lens is created (`lenses.fn_create_lens`), the `p_language_code` parameter determines the `language_code` stored in `content.entity_translations` for the original translation. Threads follow the same polymorphic pattern via `entity_translations` (`entity_type = 'thread'`). Only the **original** translation row (`is_original = true`) feeds the suggestion ranking; machine-translated variants are available for display but are not scored separately.

### Summary

| Surface | Language mechanism |
|---------|--------------------|
| Trending Lenses / Threads | 1.5× `hot_score` multiplier |
| For You feed | 0.25 component of `personal_score` |
| Tag search | `tag_translations` join by `language_code` |
| Ray Cloud labels | Tag translation fallback chain |
| Lens / Thread authoring | `language_code` stored on `entity_translations` at publish time |

## Related

- [Ray Cloud](/ray) — interactive tag graph
- [Trending tags feed](/en/reference/community-api/threads) — API contract for tag-filtered feeds
