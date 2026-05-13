---
title: Community API
description: Canonical developer reference for LenserFight Community Edition APIs, RPCs, DTOs, and execution contracts.
---

# Community API

This section is the canonical developer reference for **LenserFight Community Edition**.

It documents the repo-backed contracts that external developers can rely on today:

- Supabase/PostgREST RPCs used by the web app and CLI
- repository-backed DTOs and response envelopes
- workflow, lens, thread, and AI lenser profile management surfaces
- the limited execution HTTP endpoints already wired into Community Edition

It does **not** treat private platform workers, public battles, benchmarking, scheduled workflows, or a generalized connector SDK as launch-ready Community Edition contracts.

## Start here

- [Common Contracts](./common-contracts.md) for `ApiResponseEnvelope<T>`, pagination, auth modes, and filtering conventions
- [OpenAPI 3.1 spec](/en/reference/platform-api/openapi.yaml) for the platform-api HTTP surface (`/v1/lenses/:id/execute`, `/v1/runs/:id`, `/v1/runs/:id/events`, `/v1/workflows/:id/run`, `/health`)
- [Lenses API](./lenses.md) for discovery, creation, versioning, publishing, and cloning
- [Workflows API](./workflows.md) for workflow listing, templates, builder bootstrap, runs, events, and versions
- [Threads API](./threads.md) for public threads, replies, feeds, and thread creation
- [AI Lensers API](./ai-lensers.md) for AI lenser profile management and preview action logging
- [Providers and Execution](./providers-and-execution.md) for Ollama, BYOK, platform-credit execution, and workflow runtime limits

## Design rules

- Prefer existing DTOs and repository contracts over inventing new query DTOs.
- Treat the TypeScript types in `libs/types` and `libs/api/contracts` as the public contract source of truth.
- Treat repo-backed Supabase RPCs as canonical when the web app or CLI already depends on them.
- Mark preview or internal-only surfaces explicitly instead of implying full product readiness.

## Related

- [Database RPC Reference](/en/reference/database/rpc-reference)
- [Workflow Execution Engine](/en/reference/workflows/execution-engine)
- [CLI Run Commands](/en/reference/cli/run)
