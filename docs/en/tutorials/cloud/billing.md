---
title: Billing & Usage
description: Understand credits, track usage, manage API costs, and configure subscription plans on LenserFight Cloud.
head:
  - - meta
    - name: og:title
      content: Billing & Usage — LenserFight Cloud
  - - meta
    - name: og:description
      content: Credits, usage tracking, API costs, limits, and subscription plans on LenserFight Cloud.
---

# Billing & Usage

This tutorial covers how credits work, how to track usage, and how to manage costs on LenserFight Cloud.

> **Note:** Billing is a Cloud-only feature. Community Edition (self-hosted) does not have platform-credit charges — you pay your AI provider directly.

## Prerequisites

- [Cloud Getting Started](/en/tutorials/cloud/getting-started) completed

---

## Credits

Credits are the platform currency for AI model execution on LenserFight Cloud.

### How credits work

```
You run a Lens → Model generates tokens → Tokens × rate = credits charged
```

| Factor | Description |
|--------|-------------|
| **Input tokens** | Tokens in the prompt sent to the model |
| **Output tokens** | Tokens in the model's response |
| **Model rate** | Cost per token varies by model |
| **Tool usage** | Some tools incur additional credits |

### Credit rates by model

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| GPT-4o | 5 credits | 15 credits |
| GPT-4o-mini | 0.3 credits | 1.2 credits |
| Claude Sonnet 4 | 6 credits | 30 credits |
| Claude Opus 4 | 30 credits | 150 credits |
| Gemini 2.0 Flash | 0.15 credits | 0.6 credits |
| Ollama (BYOK) | 0 credits | 0 credits |

> Rates are approximate. Check the current pricing page for exact values.

---

## Purchasing credits

### Credit packs

1. Navigate to **Settings → Billing → Buy Credits**
2. Select a credit pack:

| Pack | Credits | Price | Bonus |
|------|---------|-------|-------|
| Starter | 100 | $5 | — |
| Builder | 500 | $20 | +25 bonus |
| Pro | 2,000 | $75 | +150 bonus |
| Team | 10,000 | $350 | +1,000 bonus |

3. Complete checkout via Stripe
4. Credits are added to your balance immediately

### Subscription plans

| Plan | Monthly credits | Price/month | Features |
|------|----------------|-------------|----------|
| **Free** | 50 | $0 | Personal workspace, community access |
| **Pro** | 1,000 | $29 | Team workspaces, priority support |
| **Team** | 5,000 | $99 | Unlimited members, API access |
| **Enterprise** | Custom | Contact sales | SLA, SSO, dedicated support |

---

## Usage tracking

### Dashboard

Navigate to **Settings → Billing → Usage** to see:

| Metric | Description |
|--------|-------------|
| **Current balance** | Available credits |
| **This period** | Credits used this billing cycle |
| **Daily average** | Average daily credit consumption |
| **Projected** | Estimated month-end usage |

### Per-run cost breakdown

Each workflow run shows:
- Node-by-node token usage
- Model-specific costs
- Tool usage charges
- Total credit cost

### Export usage data

Download usage reports:

```
Settings → Billing → Usage → Export CSV
```

Fields: date, workflow, agent, model, input_tokens, output_tokens, credits, status

---

## Cost management

### Setting budget alerts

1. Navigate to **Settings → Billing → Alerts**
2. Configure alerts:
   - **Warning** — notify at 80% of monthly budget
   - **Critical** — notify at 95% of monthly budget
   - **Hard limit** — stop executions at 100%

### Per-agent budgets

Set credit limits per agent:

1. Navigate to **Agent → Settings → Budget**
2. Set **Max credits per run** (default: 10)
3. Set **Max credits per day** (default: 100)
4. Set **Max credits per month** (default: 1,000)

### Cost optimization tips

| Strategy | Impact |
|----------|--------|
| Use smaller models for simple tasks | 10–50× cheaper |
| Reduce prompt length | Directly reduces input tokens |
| Set max output tokens | Prevents runaway generation |
| Cache repeated prompts | Avoid re-running identical inputs |
| Use Ollama for development | Free local execution |
| Pin Lens versions | Prevent unexpected cost changes |

---

## API costs

### Developer token usage

API calls via developer tokens consume credits at the same rates as web app usage.

```bash
# Check your balance via API
curl "https://api.lenserfight.com/v1/billing/balance" \
  -H "Authorization: Bearer $API_KEY"
```

### Rate limits

| Plan | Requests/minute | Concurrent runs |
|------|----------------|----------------|
| Free | 10 | 1 |
| Pro | 60 | 5 |
| Team | 300 | 20 |
| Enterprise | Custom | Custom |

When rate-limited, the API returns `429 Too Many Requests` with a `Retry-After` header.

---

## Workspace billing

### Team workspaces

Team workspace billing:
- The workspace **owner** is billed
- All members' usage is charged to the workspace
- Per-member budgets can be set by admins

### Billing history

View past invoices:

1. Navigate to **Settings → Billing → History**
2. Download PDF invoices
3. View line-item details

---

## Next steps

- [Cloud Getting Started](/en/tutorials/cloud/getting-started) — initial setup
- [Team Collaboration](/en/tutorials/cloud/collaboration) — manage team costs
- [Building Workflows](/en/tutorials/cloud/workflows) — optimize workflow costs
