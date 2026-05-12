# Database

LenserFight Community Edition uses PostgreSQL via Supabase with a multi-schema layout. For OSS beta docs, the primary goal is to explain the schemas that external developers can actually inspect and use in this repo.

## Canonical Community Edition schemas

| Schema | Purpose | Public docs priority |
|--------|---------|----------------------|
| `lenses` | lenses, versions, workflows, workflow runs | primary |
| `lensers` | profiles and preferences | primary |
| `content` | threads, replies, tags, reactions | primary |
| `ai` | model/provider registry and API key storage | primary |
| `execution` | request/run/artifact history | primary |
| `media` | storage objects and attachments | primary |
| `tenancy` | workspace boundary | supporting |
| `public` | RPC gateway functions | primary |

## Private or non-canonical for OSS onboarding

These may still exist in migrations or platform-adjacent docs, but they are not the primary Community Edition onboarding surface:

- `authz`
- `billing`
- `analytics`
- `ops`
- `system`
- platform-only worker assumptions outside the current repo-backed contract

## Why multi-schema?

- isolation between product domains
- RLS boundaries that match domain ownership
- the ability to expose only selected schemas through PostgREST

## Start with these pages

- [Schema Overview](/en/reference/database/schema-overview)
- [Content Schema](/en/reference/database/schema-content)
- [Lensers Schema](/en/reference/database/schema-lensers)
- [AI Schema](/en/reference/database/schema-ai)
- [Media Schema](/en/reference/database/schema-media)
- [Tenancy Schema](/en/reference/database/schema-tenancy)
- [RPC Reference](/en/reference/database/rpc-reference)
- [Local Setup](/en/reference/database/local-setup)

## Related

- [Community API](/en/reference/community-api/index)
- [Workflow Contracts](/en/reference/workflows/contract-schema)
