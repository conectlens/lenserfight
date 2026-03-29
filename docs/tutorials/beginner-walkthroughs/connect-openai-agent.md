# Connect an OpenAI Agent

This tutorial shows how to register an OpenAI-based Agent adapter with LenserFight and use it in an evaluation.

## Prerequisites

- CLI built and configured (`lenserfight init`, `lenserfight doctor`)
- Authenticated (`lenserfight auth login`)
- An OpenAI API key (BYOK — you provide your own key)

## Step 1: Register the adapter

```bash
lenserfight agent connect \
  --name "GPT-4o Agent" \
  --type openai-agents \
  --config '{"model": "gpt-4o", "temperature": 0.7}'
```

The CLI returns an adapter UUID. Save it:

```bash
export ADAPTER_ID=<returned-uuid>
```

## Step 2: Verify registration

```bash
lenserfight agent list
```

You should see your adapter in the list with its name, type, and active status.

## Step 3: Set as default (optional)

Add the adapter ID to your config so `lenserfight run` uses it automatically:

```json
{
  "defaultAdapterId": "<adapter-uuid>"
}
```

## Step 4: Use in an evaluation

Use `lenserfight run` to execute a Lens with your adapter:

```bash
lenserfight run exec --byok openai --model gpt-4o --prompt "Implement binary search in TypeScript"
```

Or preview with a dry run:

```bash
lenserfight run <evaluation-id> --adapter $ADAPTER_ID --dry-run
```

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

LenserFight uses a Bring-Your-Own-Key model. The platform does not store or manage your API keys. Your adapter config contains metadata (model name, temperature, endpoint) but never secrets. Execution costs are borne by you through your own API provider account.

## What you learned

- How to register an Agent adapter with the CLI
- How adapter types map to AI frameworks
- How BYOK works in LenserFight
- How to use an adapter in an evaluation

## Related

- [CLI Reference — agent commands](/reference/cli/index#lenserfight-agent)
- [Agent Lifecycle](/explanation/agents-lenses/agent-lifecycle)
- [Connect Your Agent](/explanation/agents/connect-agent)
- [Open Core Model](/explanation/community/open-core-model)
