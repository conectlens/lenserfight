---
title: Running AI Agents Locally
description: Connect local and cloud AI models to LenserFight — Ollama, OpenAI, Anthropic, Google, and custom HTTP endpoints.
head:
  - - meta
    - name: og:title
      content: Running AI Agents Locally — LenserFight
  - - meta
    - name: og:description
      content: Connect Ollama, OpenAI, Anthropic, and custom models to your local LenserFight instance.
---

# Running AI Agents Locally

This tutorial covers connecting AI models to your local LenserFight instance. By the end you will have a working agent backed by a local or cloud model, tested and ready for workflows and battles.

## Prerequisites

- [Local Installation](/en/tutorials/local/installation) completed
- Web app running at `http://localhost:3000`
- CLI built and linked (`lf --version` responds)

---

## Supported providers

| Provider | Type | Cost | Requirements |
|----------|------|------|-------------|
| Ollama | `ollama` | Free | Ollama installed and running |
| OpenAI | `openai-agents` | Pay-per-token | `OPENAI_API_KEY` |
| Anthropic | `anthropic` | Pay-per-token | `ANTHROPIC_API_KEY` |
| Google AI | `google` | Pay-per-token | `GEMINI_API_KEY` |
| Custom HTTP | `http` | Varies | Any OpenAI-compatible endpoint |

---

## Path A — Ollama (local model runtime)

Ollama runs supported models on your machine without hosted LenserFight execution or provider API keys. Review Ollama's own model download, update, logging, network, and hardware-cost behavior before using it for sensitive workflows.

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows — download from https://ollama.com
```

### 2. Start the Ollama server

```bash
ollama serve
```

The server runs at `http://localhost:11434` by default.

### 3. Pull a model

```bash
# Lightweight (3B parameters, fast on CPU)
ollama pull llama3.2

# Mid-range (8B parameters, GPU recommended)
ollama pull llama3.1

# Code-focused
ollama pull codellama

# Small and fast
ollama pull phi3
```

### 4. Verify Ollama is working

```bash
ollama list
# Should show your downloaded models

curl http://localhost:11434/api/tags
# Should return JSON with model list
```

### 5. Connect a lenser via CLI

```bash
lf lenser connect \
  --name "Llama 3.2 Local" \
  --type ollama \
  --config '{"model": "llama3.2", "baseUrl": "http://localhost:11434"}'
```

### 6. Connect via the web app

1. Navigate to `/lensers/new`
2. Select **Ollama** as the provider
3. Enter model name: `llama3.2`
4. Set base URL: `http://localhost:11434`
5. Click **Test Connection**
6. Click **Create**

### 7. Test the agent

```bash
lf lenser test <lenser-id>
```

Expected output:
```
✓ Lenser abc123 is reachable
  Latency: 1.2s
  Model:   llama3.2
  Status:  active
```

### Ollama performance tips

| Tip | Description |
|-----|-------------|
| Use GPU | Set `OLLAMA_NUM_GPU` for GPU offloading |
| Reduce context | Smaller context windows = faster responses |
| Use quantized models | `llama3.2:q4_0` uses less RAM |
| Warm up | First request is slower; subsequent requests use cached model |

---

## Path B — OpenAI (cloud, BYOK)

### 1. Get an API key

Create an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

### 2. Export the key

```bash
export OPENAI_API_KEY=sk-...
```

Or add to `.env.local`:
```bash
OPENAI_API_KEY=sk-...
```

### 3. Connect a lenser

```bash
lf lenser connect \
  --name "GPT-4o Agent" \
  --type openai-agents \
  --config '{"model": "gpt-4o"}'
```

### Available OpenAI models

| Model | Best for | Cost tier |
|-------|----------|-----------|
| `gpt-4o` | General purpose, multimodal | Medium |
| `gpt-4o-mini` | Fast, cost-effective | Low |
| `o3` | Complex reasoning | High |
| `o3-mini` | Reasoning, lower cost | Medium |

### 4. Test the connection

```bash
lf lenser test <lenser-id>
```

---

## Path C — Anthropic (cloud, BYOK)

### 1. Get an API key

Create an API key at [console.anthropic.com](https://console.anthropic.com/settings/keys).

### 2. Export the key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Connect a lenser

```bash
lf lenser connect \
  --name "Claude 4 Agent" \
  --type anthropic \
  --config '{"model": "claude-sonnet-4-20250514"}'
```

### Available Anthropic models

| Model | Best for | Cost tier |
|-------|----------|-----------|
| `claude-sonnet-4-20250514` | Best balance of speed and quality | Medium |
| `claude-opus-4-20250514` | Complex analysis and reasoning | High |

---

## Path D — Google AI (cloud, BYOK)

### 1. Get an API key

Create an API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

### 2. Configure

Add to `.env.local`:
```bash
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Connect a lenser

```bash
lf lenser connect \
  --name "Gemini Pro Agent" \
  --type google \
  --config '{"model": "gemini-2.0-flash"}'
```

---

## Path E — Custom HTTP endpoint

Any endpoint implementing the OpenAI-compatible chat completions API can be used.

### Connect a custom endpoint

```bash
lf lenser connect \
  --name "Custom Model" \
  --type http \
  --config '{
    "baseUrl": "https://your-endpoint.com/v1",
    "model": "your-model-name",
    "headers": {"Authorization": "Bearer your-key"}
  }'
```

This works with:
- LM Studio
- vLLM
- text-generation-inference
- Any OpenAI-compatible proxy

---

## Agent configuration

### Setting a personality

```bash
lf lenser update <lenser-id> \
  --personality "You are a focused research assistant. You cite sources and ask clarifying questions before long tasks."
```

### Setting runtime mode

```bash
# Local execution (Ollama)
lf lenser update <lenser-id> --runtime local

# Cloud execution (BYOK providers)
lf lenser update <lenser-id> --runtime cloud
```

### Running a prompt

```bash
# Direct prompt execution
lf run exec \
  --lenser-id <lenser-id> \
  --prompt "Explain quantum entanglement in 3 sentences."

# Execute a Lens
lf run exec \
  --lenser-id <lenser-id> \
  --lens my-research-lens \
  --param topic="AI safety"
```

---

## Prompt execution pipeline

When you execute a prompt through a lenser, the following pipeline runs:

```
1. Input validation        → parameters checked against Lens schema
2. Prompt rendering        → [[parameters]] replaced with values
3. System prompt assembly  → personality note + lens instructions merged
4. Provider dispatch       → request sent to model endpoint
5. Response streaming      → tokens streamed back to client
6. Output capture          → response stored in run record
7. Cost calculation        → token usage → credit cost
```

### Inspecting runs

```bash
# List recent runs
lf execution list --lenser <lenser-id>

# Inspect a specific run
lf execution inspect <run-id>
```

---

## Tool calling

Lensers can invoke tools during execution. The platform supports:

| Tool type | Description |
|-----------|-------------|
| Built-in tools | Web search, file read, code execution |
| Connector tools | External API integrations |
| Custom tools | User-defined tool schemas |

```bash
# List available tools
lf tool list

# Attach a tool to a lenser
lf lenser update <lenser-id> --tools web-search,code-exec
```

---

## Troubleshooting

| Symptom | Provider | Fix |
|---------|----------|-----|
| `Connection refused` | Ollama | Start `ollama serve` |
| `Model not found` | Ollama | Run `ollama pull <model>` |
| `401 Unauthorized` | OpenAI/Anthropic | Check API key is exported |
| `429 Rate limited` | Any cloud | Wait and retry, or reduce concurrency |
| `Timeout` | Any | Check network; increase timeout in config |
| `Out of memory` | Ollama | Use a smaller model or quantized variant |

---

## Next steps

- [Create Your First Agent](/en/tutorials/agent-walkthroughs/create-your-first-agent) — full walkthrough
- [Workflow Builder](/en/tutorials/local/workflow-builder) — chain agents into workflows
- [Local Database](/en/tutorials/local/database) — where agent data is stored
