---
title: Threads API
description: Community Edition thread, reply, and feed contracts.
---

# Threads API

Threads are the public discussion surface in Community Edition. The repo supports public discovery, replies, signed-in feeds, and owner-managed thread lifecycle actions.

## Primary database surfaces

- `content.threads`
- `content.thread_replies`
- `content.entity_translations`
- `content.reactions`
- `content.tag_map`
- `vw_content_threads_public`

## Canonical DTOs and view models

From [`threads.types.ts`](../../../libs/types/src/lib/threads.types.ts):

- `CreateThreadDTO`
- `ThreadRecord`
- `ThreadFeedItem`
- `ThreadDetailViewModel`
- `ThreadReplyRecord`
- `ThreadReplyViewModel`

## Supported flows

- public thread listing
- tag-filtered listing
- thread detail
- reply pagination
- trending threads
- personal feed
- following feed
- create thread
- create reply
- update thread
- delete thread

## Existing thread RPCs

| RPC | Purpose |
|-----|---------|
| `fn_content_create_thread` | atomic thread creation |
| `fn_content_get_threads_by_tag` | tag-filtered thread listing |
| `fn_get_thread_replies_page` | paginated replies |
| `fn_content_get_trending_threads` | public trending threads |
| `fn_content_get_personal_threads` | signed-in personal feed |
| `fn_content_get_following_threads` | following feed |

## Example DTO

```ts
type CreateThreadDTO = {
  title: string
  content: string
  tagIds: string[]
  visibility: 'public' | 'community' | 'private'
}
```

## Example flows

### Trending public threads

```ts
await threadsService.getTrendingThreads('en', 0, 20)
```

### Threads for a tag

```ts
await threadsService.getThreadsByTag('workflows', 'newest', 0, 20)
```

### Following feed

```ts
await threadsService.getFollowingFeed(lenserId, 0, 20)
```

### Create thread

```ts
await threadsService.createThread({
  title: 'Sharing a local workflow pattern',
  content: 'Here is how I am chaining research and validation lenses locally.',
  tagIds: ['<tag-id>'],
  visibility: 'public',
})
```

## Auth and access

| Operation | Auth |
|-----------|------|
| public listing/detail | `anon` for public threads |
| personal/following feeds | `authenticated` |
| create reply / create thread | authenticated |
| update/delete thread | owner-only |

## Notes

- Thread creation is not a raw table-write contract in the repo; the web app uses `fn_content_create_thread`.
- Reply reads support pagination through `limit` and `offset`.
- Docs should describe thread visibility using the same `public` / `community` / `private` values used in `CreateThreadDTO`.

## Related

- [Lenses API](./lenses.md)
- [Database Content Schema](/en/reference/database/schema-content)
