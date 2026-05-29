---
title: RSS Feed
description: Fetches and parses an RSS or Atom feed.
---

# RSS Feed

## Overview

The RSS Feed node fetches and parses a remote RSS 2.0 or Atom 1.0 feed, emitting a structured list of feed items (title, link, description, published date, author, and raw content) for downstream processing. Use it to monitor news sources, blog feeds, or any syndicated content pipeline that triggers battles or supplies prompts to AI contenders. No credentials are required for public feeds; authenticated feeds (HTTP Basic or bearer token) are supported via the credentials field. If the fetch fails or the feed is malformed, execution routes to the error output with a diagnostic message.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | Full URL of the RSS or Atom feed endpoint (e.g. https://feeds.example.com/news.rss). |
| `maxItems` | number | No | Maximum number of feed items to return per fetch. Defaults to 20. Use to cap downstream volume. |
| `includeContent` | boolean | No | When true, includes the full encoded content or summary body in each item alongside the description snippet. Defaults to false. |
| `refreshInterval` | number | No | Polling interval in seconds when the node is used in a scheduled workflow. Set to 0 to fetch only once per trigger. |
| `filterKeywords` | string | No | Comma-separated keywords to filter items by title or description. Only items containing at least one keyword are emitted. |
| `credentials` | enum | No | Reference to a stored credential set (HTTP Basic or Bearer token) for authenticated feeds. Leave empty for public feeds. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `trigger` | any | Accepts any upstream signal that initiates the fetch. Typically connected to a Schedule or Webhook node. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `items` | FeedItem[] | Array of parsed feed items, each containing title, link, description, publishedAt (ISO 8601), author, and optionally content. |
| `meta` | FeedMeta | Feed-level metadata: title, description, link, language, and lastBuildDate of the channel. |
| `error` | Error | Emitted when the fetch fails (network error, timeout, HTTP 4xx/5xx) or when the payload cannot be parsed as valid RSS or Atom. |

## Example

```json
{
  "nodeType": "rss_feed",
  "config": {
    "url": "https://feeds.arstechnica.com/arstechnica/technology-lab",
    "maxItems": 10,
    "includeContent": true,
    "filterKeywords": "AI, machine learning, LLM"
  }
}
```
