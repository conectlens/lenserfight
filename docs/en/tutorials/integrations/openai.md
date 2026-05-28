---
title: OpenAI Integration
description: Connect OpenAI models to LenserFight — setup, authentication, example workflows, rate limits, and troubleshooting.
head:
  - - meta
    - name: og:title
      content: OpenAI Integration — LenserFight
  - - meta
    - name: og:description
      content: Complete guide to integrating OpenAI models with LenserFight.
---

# OpenAI Integration

This guide covers connecting OpenAI models to LenserFight, from initial setup through production workflows.

## Setup

### 1. Create an OpenAI API key

1. Navigate to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Name it (e.g., "LenserFight")
4. Copy the key — it is only shown once

### 2. Configure the key

**Local development:**
```bash
export OPENAI_API_KEY=sk-...
```

Or add to `.env.local`:
```bash
OPENAI_API_KEY=sk-...
```

**Cloud (BYOK):**
1. Navigate to **Settings → Providers → OpenAI**
2. Enter your API key
3. Click **Save & Test**

### 3. Create a lenser

```bash
lf lenser connect \
  --name "GPT-4o Agent" \
  --type openai-agents \
  --config '{"model": "gpt-4o"}'
```

---

## Authentication

| Method | Use case |
|--------|----------|
| **API key** | Standard usage, stored in env or platform |
| **Organization ID** | Multi-org accounts (optional header) |
| **Project ID** | Project-scoped billing (optional) |

```bash
# With org and project scoping
lf lenser connect \
  --name "Org Agent" \
  --type openai-agents \
  --config '{
    "model": "gpt-4o",
    "organization": "org-...",
    "project": "proj-..."
  }'
```

---

## Available models

| Model | Type | Context window | Best for |
|-------|------|---------------|----------|
| `gpt-4o` | Chat | 128K | General purpose, multimodal |
| `gpt-4o-mini` | Chat | 128K | Fast, cost-effective |
| `o3` | Reasoning | 200K | Complex reasoning tasks |
| `o3-mini` | Reasoning | 200K | Reasoning at lower cost |
| `gpt-4.1` | Chat | 1M | Long context tasks |

---

## Example workflows

### Research and summarize

```
[Web Search Agent (GPT-4o)]
    → searches for topic
    → returns structured findings
        ↓
[Summarizer (GPT-4o-mini)]
    → condenses into executive summary
```

### Code generation and review

```
[Code Generator (GPT-4o)]
    → generates code from spec
        ↓
[Code Reviewer (o3)]
    → reviews for correctness and security
        ↓
[Test Writer (GPT-4o-mini)]
    → generates unit tests
```

---

## Rate limits

| Model | RPM (requests/min) | TPM (tokens/min) |
|-------|-------------------|-------------------|
| `gpt-4o` | 500 | 800K |
| `gpt-4o-mini` | 500 | 2M |
| `o3` | 500 | 800K |

> These are default Tier 1 limits. Higher tiers are available based on usage.

### Handling rate limits

LenserFight automatically:
1. Detects `429` responses
2. Reads the `Retry-After` header
3. Queues and retries the request
4. Reports the delay in the execution log

---

## Security considerations

1. **Never commit API keys** — use environment variables or the platform's secure storage
2. **Rotate keys periodically** — create new keys and revoke old ones
3. **Use project scoping** — isolate costs and permissions per project
4. **Monitor usage** — check the OpenAI dashboard for unexpected charges
5. **Set spending limits** — configure in the OpenAI billing dashboard

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Invalid or expired API key | Create a new key |
| `429 Too Many Requests` | Rate limit exceeded | Wait and retry; upgrade tier |
| `503 Service Unavailable` | OpenAI outage | Check [status.openai.com](https://status.openai.com) |
| `context_length_exceeded` | Input too long | Reduce prompt or use a model with larger context |
| `insufficient_quota` | No credits on OpenAI account | Add billing to your OpenAI account |

---

## Next steps

- [Anthropic Integration](/en/tutorials/integrations/anthropic)
- [Ollama Integration](/en/tutorials/integrations/ollama)
- [Running Agents Locally](/en/tutorials/local/running-agents)
