---
title: Third-Party Provider Integration — LenserFight MCP Server
description: Everything a third-party AI product needs to embed the LenserFight MCP server — quickstart, connection modes, OAuth 2.1 PKCE, and complete tool reference for all 31 tools.
---

# Third-Party Provider Integration

This section covers everything you need to embed the **LenserFight MCP server** into your AI product. Once integrated, your users can search, run, and manage their LenserFight lenses, battles, and workflows directly from your interface — without leaving your product.

---

## What you get

The LenserFight MCP server exposes **31 tools** via the [Model Context Protocol](https://modelcontextprotocol.io), served from a hosted HTTPS endpoint with OAuth 2.1 PKCE authentication. Your product connects once; your users authorize once; everything just works.

| Capability group | Tools | What your users can do |
|---|---|---|
| **Lenses** | 15 | Browse a library of reusable versioned prompt templates, run them with parameters, fork and customize them |
| **Battles** | 8 | Create and judge AI-vs-AI or human-vs-AI competitions, read scores, manage the lifecycle |
| **Workflows** | 8 | Build multi-step AI execution pipelines, start runs, poll status, read logs |

---

## Documentation map

This integration section is organized following the [Diátaxis framework](https://diataxis.fr) into four page types:

| Page | Type | When to read it |
|---|---|---|
| [Provider Quickstart](./provider-quickstart) | **Tutorial** | You want to connect your product in 5 minutes with a working example |
| [Integration Guide](./provider-integration) | **Explanation** | You want to understand the architecture, transport modes, RLS, and token model before building |
| [Connection Modes](./provider-connection) | **How-to** | You want step-by-step instructions for LF Cloud, stdio, or HTTP + tunnel |
| [OAuth & Authentication](./provider-oauth) | **How-to** | You want to implement the full OAuth 2.1 PKCE flow, dynamic registration, and token lifecycle |
| [All 31 Tools](./provider-tools) | **Reference** | You need parameter tables and return shapes for every tool |

---

## The endpoint

```
https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/mcp
```

This is the stable LF Cloud endpoint. No local server required. Authentication is handled through the OAuth flow — your users sign in with their LenserFight credentials and authorize your product once.

---

## Minimum integration checklist

- [ ] Register your OAuth client: `POST /oauth/register` with your `redirect_uri`
- [ ] Implement OAuth 2.1 PKCE authorization code flow
- [ ] Store the `lf_mcp_*` access token per user
- [ ] Include `Authorization: Bearer lf_mcp_...` on every MCP request
- [ ] Handle `No Lenser profile found` by directing users to complete onboarding at [lenserfight.com](https://lenserfight.com)
- [ ] Test with `lens_list` to verify the connection is healthy

---

## Health check

```bash
curl https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/health
# {"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}
```

---

## What users need

Before a user can authorize your integration:

1. A LenserFight account (sign up at [lenserfight.com](https://lenserfight.com))
2. A completed Lenser profile (a handle chosen during onboarding)

Users without a handle will see `No Lenser profile found` during authorization. Direct them to lenserfight.com to complete the step.

---

## Start here

<div class="tip custom-block">

**First time?** Start with the [Provider Quickstart](./provider-quickstart) — it walks through registration, authorization, and a real tool call in under 5 minutes.

</div>

Then read the [Integration Guide](./provider-integration) to understand the architecture before writing production code.
