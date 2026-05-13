# Connect an OpenAI Agent

This tutorial shows the **beta-safe** way to work with an OpenAI-backed integration in Community Edition: use `lf run exec` for direct execution, and treat the agent surface as preview metadata rather than a full automation contract.

## Prerequisites

- CLI built and configured (`lenserfight init`, `lenserfight doctor`)
- Authenticated (`lenserfight auth login`)
- An OpenAI API key (BYOK)

## Step 1: Use direct BYOK execution first

```bash
lenserfight run exec --byok openai --model gpt-4o --prompt "Explain workflow retries simply"
```

This is the launch-ready path for OpenAI use in Community Edition.

## Step 2: Optionally register preview metadata

```bash
lenserfight agent connect \
  --name "GPT-4o Agent" \
  --type openai-agents \
  --config '{"model": "gpt-4o", "temperature": 0.7}'
```

Use this only when you want a managed record in the UI or CLI. Do not treat it as a stable adapter-runtime contract.

## Supported adapter types

| Type | Use case |
|------|----------|
| `openai-agents` | OpenAI Agents SDK — best for GPT-4o, GPT-5 |
| `langchain` | LangChain chains and agents |
| `crewai` | CrewAI multi-agent frameworks |
| `mcp` | Model Context Protocol servers |
| `ollama` | Local models via Ollama |
| `http` | Any HTTP endpoint |
| `custom` | Custom integration |

## BYOK model

Community Edition favors explicit BYOK usage:

- `lf run exec --byok openai ...` for direct execution
- local or UI-managed metadata when you want a preview agent record
- workflow UI for workflow composition and run monitoring

## What you learned

- how to use OpenAI through the supported `run exec` path
- how to register preview metadata if you need an agent record
- why Community Edition does not yet promise autonomous adapter flows

## Related

- [Run Commands](/en/reference/cli/run)
- [Community API: Providers and Execution](/en/reference/community-api/providers-and-execution)
- [Connect Your Agent](/en/explanation/agents/connect-agent)
