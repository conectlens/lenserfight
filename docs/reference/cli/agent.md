# Agent Commands

The `lenserfight agent` commands are available in Community Edition, but they should be treated as **AI lenser profile and preview integration commands**, not as proof of a stable connector SDK.

Use these commands for metadata and managed integration records, not as proof of a fully stable public adapter SDK.

```bash
lenserfight agent <subcommand>
```

## Current status

- agent records and profile management exist
- supported types are still a preview contract
- autonomous evaluation automation is not a launch-ready promise
- if you need a generalized connector surface, open an issue before building against assumptions

## Subcommands

| Subcommand | Purpose |
|------------|---------|
| `connect` | Register an agent record |
| `list` | List your registered agent records |
| `view` | Show config and status for an agent record |
| `enable` | Re-activate a deactivated record |
| `remove` | Deactivate a record |
| `test` | Send a probe request to a registered record |
| `types` | List the preview type names |

## Preview types

| Type | Notes |
|------|-------|
| `openai-agents` | Preview metadata type |
| `langchain` | Preview metadata type |
| `crewai` | Preview metadata type |
| `mcp` | Preview metadata type |
| `ollama` | Preview metadata type |
| `http` | Preview metadata type |
| `custom` | Preview metadata type |

## Example

```bash
lenserfight agent connect \
  --name "My Agent" \
  --type openai-agents \
  --config '{"model":"gpt-4o"}'
```

## Related

- [Connect an Agent](/explanation/agents/connect-agent)
- [Agent Lifecycle](/explanation/agents/agent-lifecycle)
- [Run Commands](run.md)
- [Community API: AI Lensers](/reference/community-api/ai-lensers)
