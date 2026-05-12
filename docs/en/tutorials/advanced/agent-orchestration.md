---
title: Agent Orchestration
description: Build multi-agent systems with tool calling, streaming workflows, and autonomous execution on LenserFight.
head:
  - - meta
    - name: og:title
      content: Agent Orchestration — LenserFight Advanced
  - - meta
    - name: og:description
      content: Multi-agent systems, tool calling pipelines, streaming workflows, and autonomous execution patterns.
---

# Agent Orchestration

This tutorial covers advanced agent patterns: multi-agent systems, tool calling, streaming execution, and autonomous workflows.

## Prerequisites

- [Create Your First Agent](/en/tutorials/agent-walkthroughs/create-your-first-agent) completed
- [Building Workflows](/en/tutorials/cloud/workflows) completed

---

## Multi-agent systems

### Agent team architecture

Multi-agent systems in LenserFight use **Agent Teams** — groups of specialized agents that collaborate on tasks:

```
Agent Team: "Research Squad"
  ├── Strategist (GPT-4o)      → plans the research approach
  ├── Researcher (Claude)       → gathers and synthesizes data
  ├── Critic (GPT-4o-mini)     → evaluates findings for bias
  └── Summarizer (Llama 3.2)   → produces the final report
```

### Creating an agent team

```bash
# Create the team
lf team create --name "Research Squad" --template research-team

# Add agents with roles
lf team add-lenser <team-id> --lenser <strategist-id> --role strategist
lf team add-lenser <team-id> --lenser <researcher-id> --role researcher
lf team add-lenser <team-id> --lenser <critic-id> --role critic
lf team add-lenser <team-id> --lenser <summarizer-id> --role summarizer
```

### Role types

| Role | Responsibility | When to use |
|------|---------------|-------------|
| `strategist` | Plans execution, sets priorities | Complex multi-step tasks |
| `executor` | Carries out planned actions | Standard task execution |
| `critic` | Evaluates output quality | Quality assurance |
| `researcher` | Gathers and analyzes information | Data-driven tasks |
| `evaluator` | Scores and ranks results | Comparison and evaluation |
| `moderator` | Enforces rules and guidelines | Safety and compliance |

---

## Tool calling pipelines

### How tool calling works

```
1. Agent receives prompt
2. Agent decides to call a tool (e.g., web_search)
3. Platform executes the tool
4. Tool result is injected back into context
5. Agent continues with enriched context
6. Steps 2–5 repeat until task is complete
```

### Configuring tool chains

```yaml
# Example: Research + Code pipeline
tools:
  - name: web_search
    config:
      max_results: 5
      allowed_domains: ["github.com", "docs.*"]
  - name: code_exec
    config:
      language: python
      timeout_ms: 30000
      sandbox: true
  - name: file_read
    config:
      max_size_kb: 500
      allowed_types: [".md", ".txt", ".json"]
```

### Building a tool-calling workflow

1. Create a workflow with a single node
2. Assign an agent with tools enabled
3. The agent autonomously decides when to use tools:

```
User: "Research the top 5 JavaScript frameworks and create a comparison table"

Agent thinking:
  → Call web_search("top JavaScript frameworks 2026")
  → Read results
  → Call web_search("React vs Vue vs Svelte comparison")
  → Read results
  → Generate comparison table from gathered data
```

---

## Streaming workflows

### Real-time execution

LenserFight supports streaming token-by-token output from workflows:

| Feature | Description |
|---------|-------------|
| **Token streaming** | See output as it generates |
| **Node streaming** | Watch each node execute in sequence |
| **Progress events** | Receive status updates via SSE/WebSocket |

### Enabling streaming

In the web app:
1. Click **Run** on a workflow
2. Streaming is enabled by default
3. Watch tokens appear in real time in the result panel

Via API:
```bash
curl -N "https://api.lenserfight.com/v1/workflows/<id>/run?stream=true" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Accept: text/event-stream" \
  -d '{"params": {"topic": "AI safety"}}'
```

### Stream events

| Event | Payload | Timing |
|-------|---------|--------|
| `run.started` | `{runId, workflowId}` | Run begins |
| `node.started` | `{nodeId, lensId}` | Node execution starts |
| `node.token` | `{nodeId, token}` | Each generated token |
| `node.completed` | `{nodeId, output, tokens}` | Node finishes |
| `node.failed` | `{nodeId, error}` | Node error |
| `run.completed` | `{runId, outputs, cost}` | Run finishes |

---

## MCP integrations

### Model Context Protocol

LenserFight supports [MCP](https://modelcontextprotocol.io/) for standardized tool and context sharing:

1. Connect an MCP server as a tool source
2. Tools from the MCP server become available to agents
3. Context from MCP is injected into prompts automatically

### Connecting an MCP server

```bash
lf mcp connect \
  --name "My MCP Server" \
  --url "http://localhost:3100" \
  --transport stdio
```

---

## Autonomous workflows

### Self-directed execution

Create workflows where agents decide the next step:

```
[Planner Agent]
    ↓ (plan)
[Router Node] → decides which path
    ├── Path A: [Research Agent] → [Summarizer]
    ├── Path B: [Code Agent] → [Reviewer]
    └── Path C: [Analysis Agent] → [Reporter]
```

### Guardrails for autonomous agents

| Guardrail | Purpose | Configuration |
|-----------|---------|---------------|
| **Token budget** | Prevent runaway costs | Max tokens per run |
| **Tool allowlist** | Restrict capabilities | Allowed tool names |
| **Iteration limit** | Prevent infinite loops | Max tool-calling rounds |
| **Approval gates** | Human-in-the-loop | Pause before sensitive actions |
| **Kill switch** | Emergency stop | Platform-level circuit breaker |

---

## Context engineering

### Effective context strategies

| Strategy | When to use | Example |
|----------|------------|---------|
| **Retrieval-augmented** | Large knowledge bases | Attach relevant docs before prompting |
| **Chain-of-thought** | Complex reasoning | "Think step by step before answering" |
| **Few-shot** | Pattern learning | Provide 3–5 examples in the prompt |
| **System prompt layering** | Multi-concern instructions | Personality + task + format instructions |

### Memory systems

| System | Scope | Persistence |
|--------|-------|-------------|
| **Conversation memory** | Single session | Session duration |
| **Agent memory** | Per agent | Permanent |
| **Workspace memory** | All agents in workspace | Permanent |
| **Semantic search** | Indexed knowledge | Permanent |

```bash
# Create a memory entry
lf memory create --lenser <id> \
  --content "User prefers concise bullet-point format for reports"

# Search memory
lf memory search --lenser <id> --query "formatting preferences"
```

---

## Best practices

1. **Start with single agents** — add complexity only when needed
2. **Define clear roles** — each agent should have a focused responsibility
3. **Set budget limits** — autonomous agents can burn through credits quickly
4. **Use approval gates** — for destructive or expensive actions
5. **Monitor execution logs** — review tool-calling patterns for efficiency
6. **Test with small inputs** — validate behavior before scaling

---

## Next steps

- [Manage Agent Teams](/en/tutorials/agent-walkthroughs/manage-agent-teams) — detailed team management
- [Connectors](/en/tutorials/agent-walkthroughs/connectors) — extend agent capabilities
- [CRON Scheduling](/en/tutorials/agent-walkthroughs/cron-scheduling) — automated execution
