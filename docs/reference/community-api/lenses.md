---
title: Lenses API
description: Community Edition lens discovery, creation, versioning, and cloning contracts.
---

# Lenses API

Lenses are versioned prompt assets in Community Edition. The repo documents them through repository contracts, shared DTOs, Supabase views, and `lenses.*` RPCs.

## Primary database surfaces

- `lenses.lenses`
- `lenses.versions`
- `lenses.version_parameters`
- `lenses.vw_lens_version_history`
- `lenses.vw_published_versions`
- `lenses.vw_lenses`
- `vw_lenses_public`

See [Lens Versioning Schema](/reference/database/prompt-versions).

## Canonical DTOs and types

From [`libs/types/src/lib/lenses.types.ts`](../../../libs/types/src/lib/lenses.types.ts):

- `CreateLensDTO`
- `CreateLensVersionDTO`
- `LensRecord`
- `LensViewModel`
- `LensDetailViewModel`
- `LensVersion`
- `LensVersionParam`

## Supported read and discovery flows

Community Edition currently supports:

- public lens listing
- search by title
- filter by tag
- sort by newest or popular
- trending lenses
- following feed
- personal feed
- author lenses
- lens detail
- version history

## Existing repository methods

Repository source: [`lensesRepository.ts`](../../../libs/data/repositories/src/lib/repositories/lensesRepository.ts)

| Method | Purpose |
|--------|---------|
| `getAll(offset, limit)` | public listing |
| `search(query, offset, limit)` | title search |
| `filterByTag(tagSlug, sort, offset, limit)` | tag-filtered discovery |
| `sort(order, offset, limit)` | newest / popular |
| `getTrendingLenses(lang, offset, limit)` | trending discovery |
| `getPersonalFeed(offset, limit)` | signed-in feed |
| `getFollowingFeed(lenserId, offset, limit)` | following feed |
| `getByLenser(handle, offset, limit, includePrivate)` | author listing |
| `getById(id, viewerLenserId)` | detail view |
| `getVersions(lensId)` | version list |
| `getVersionsPaginated(lensId, limit, offset)` | paginated version history |
| `getVersionById(versionId)` | single version detail |

## Create, update, publish, fork

### Create lens

Uses `CreateLensDTO`:

```ts
type CreateLensDTO = {
  title: string
  description?: string | null
  content: string
  tagIds: string[]
  visibility: 'public' | 'community' | 'private'
  parentLensId?: string | null
  forkedFromExecutionId?: string | null
  params?: CreateVersionParamInput[]
}
```

Backed by:

- `lenses.fn_create_lens`

### Update lens

Backed by:

- `lenses.fn_update_lens`

### Create draft version

Backed by:

- `lenses.fn_create_draft_version`

Uses `CreateLensVersionDTO`:

```ts
type CreateLensVersionDTO = {
  lensId: string
  templateBody: string
  changelog?: string | null
  parentVersionId?: string | null
  parameters?: CreateVersionParamInput[]
}
```

### Publish version

Backed by:

- `lenses.fn_publish_version`

### Clone lens

Backed by:

- `lenses.fn_clone_lens`

## Version parameter loading

The builder and detail flows use:

- `lenses.fn_list_versions`
- `lenses.fn_get_version_params_with_tools`

These hydrate `LensVersionParam` with the referenced tool metadata.

## Filtering and ordering examples

### Popular public lenses

```ts
await lensesService.sort('popular', 0, 20)
```

### Trending lenses with language hint

```ts
await lensesService.getTrendingLenses('en', 0, 20)
```

### Lenses for a tag

```ts
await lensesService.filterByTag('ollama', 'newest', 0, 20)
```

### Lenses by author

```ts
await lensesService.getLenserLenses('alice', 0, 20)
```

## Auth and visibility rules

| Operation | Auth |
|-----------|------|
| public listing / detail | `anon` for public content |
| personal or following feeds | `authenticated` |
| create / update / publish | owner-only |
| clone | authenticated, source must be cloneable |

## Notes

- Community Edition uses versioned lenses, not legacy prompt-template contracts.
- Docs should describe `public`, `community`, and `private` visibility exactly as the repo types define them.
- Do not invent a separate “lens query DTO”; the repo already uses scalar query arguments.

## Related

- [Workflows API](./workflows.md)
- [Threads API](./threads.md)
- [Database RPC Reference](/reference/database/rpc-reference)
