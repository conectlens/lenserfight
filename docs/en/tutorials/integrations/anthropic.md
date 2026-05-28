---
title: Anthropic Integration
description: Connect Anthropic Claude models to LenserFight — setup, authentication, workflows, and troubleshooting.
head:
  - - meta
    - name: og:title
      content: Anthropic Integration — LenserFight
  - - meta
    - name: og:description
      content: Complete guide to integrating Anthropic Claude models with LenserFight.
---

# Anthropic Integration

This guide covers connecting Anthropic Claude models to LenserFight.

## Setup

### 1. Create an API key

1. Navigate to [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Click **Create Key**
3. Copy the key

### 2. Configure

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Create a lenser

```bash
lf lenser connect \
  --name "Claude Sonnet" \
  --type anthropic \
  --config '{"model": "claude-sonnet-4-20250514"}'
```

---

## Available models

| Model | Context window | Best for |
|-------|---------------|----------|
| `claude-sonnet-4-20250514` | 200K | Best balance of speed and quality |
| `claude-opus-4-20250514` | 200K | Complex analysis and extended thinking |

---

## Example workflows

### Analysis pipeline

```
[Document Analyzer (Claude Sonnet)]
    → extracts key themes
        ↓
[Deep Analyst (Claude Opus)]
    → provides detailed analysis
        ↓
[Report Writer (Claude Sonnet)]
    → formats final report
```

---

## Rate limits

| Model | RPM | TPM |
|-------|-----|-----|
| Claude Sonnet 4 | 50 | 40K |
| Claude Opus 4 | 50 | 20K |

> Limits increase with account age and usage.

---

## Security considerations

1. **Store keys in environment variables** — never hardcode
2. **Use workspace-level BYOK** — isolate keys per team
3. **Monitor via Anthropic Console** — track usage and costs

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `401 authentication_error` | Check API key |
| `429 rate_limit_error` | Wait for `retry-after` period |
| `529 overloaded_error` | Anthropic capacity issue; retry |
| `input too long` | Reduce prompt size |

---

## Next steps

- [OpenAI Integration](/en/tutorials/integrations/openai)
- [Ollama Integration](/en/tutorials/integrations/ollama)
