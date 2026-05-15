---
title: Funding Sources
description: How Chainabit credits, LF Cloud Keys (BYOK cloud), and Local Keys (BYOK local) work — where keys are stored, how they are secured, and when to use each mode.
---

# Funding Sources

Every Lens execution needs a way to pay for AI inference. LenserFight supports three funding modes depending on how you run the platform.

---

## Chainabit Credits

> Available on LenserFight Cloud only.

Chainabit is the billing layer for the ConectLens ecosystem. When you run a Lens with Chainabit as the funding source, your Chainabit credit balance is charged at the platform's AI inference rates — you do not need any provider API key.

**How it works:**

1. Connect your Chainabit account in Settings → Integrations.
2. Top up credits at [chainabit.com](https://chainabit.com).
3. Select **Chainabit** in the Funding panel before running a Lens.

**Credit balance** is shown live in the toggle. If your balance reaches zero, Chainabit is automatically disabled and the toggle falls back to your cloud BYOK keys.

**When to use:** You want a frictionless, pay-as-you-go experience without managing provider API keys.

---

## LF Cloud Keys (BYOK Cloud)

> Available on LenserFight Cloud only.

"Bring Your Own Key" (BYOK) cloud mode lets you attach your own provider API keys to your LenserFight account. Keys are stored **encrypted at rest on LenserFight's servers** and are accessible from any device or session.

**How keys are stored:**

- Encrypted with AES-256 before storage.
- The plaintext key is never logged.
- Keys are scoped to your account and never shared.

**Adding keys:** Settings → API Keys → Add Key. You can add multiple keys for different providers (Anthropic, OpenAI, Google, Mistral, etc.).

**When to use:** You have existing provider API accounts and want a managed, multi-device experience with your own billing.

---

## Local Keys (BYOK Local)

> Available in self-hosted LenserFight deployments. Also available as a browser-side option on Cloud when explicitly enabled.

Local Keys are API keys stored **only in your current browser** using AES-GCM 256-bit encryption. Nothing is ever sent to LenserFight's servers.

### Web UI: encrypted in your browser

When you add a Local Key via the Funding panel in the web UI:

- The key is encrypted immediately in the browser using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) (AES-GCM, 256-bit).
- The encrypted blob is stored in **IndexedDB** (`lenserfight-local-keys` database).
- The AES device key is derived via PBKDF2 from a per-browser salt stored in `localStorage`.
- The plaintext key exists only briefly in memory at execution time and is never written to disk or transmitted.

**Implications:**

| Situation | Result |
|---|---|
| You clear browser storage / IndexedDB | Keys are unrecoverable — add them again |
| Private / incognito browsing | Salt is session-only; keys are lost when the tab closes |
| HTTP (not HTTPS or localhost) | Web Crypto is unavailable; Local Keys cannot be added |
| Different browser on same machine | No access — keys are per-browser, not per-device |

### CLI: `.env` or environment variables

When running Lens executions via the `lf` CLI, local keys are resolved from your **environment variables** — not from IndexedDB or any LenserFight storage. The CLI never reads your browser's IndexedDB.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
lf battle exec <battle-id> --byok
```

For persistent key configuration, add them to a `.env` file in your project root or to `~/.lenserfight/env` (sourced automatically by `lf`):

```bash
# ~/.lenserfight/env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

The `~/.lenserfight/` directory is **never synced** to LenserFight's servers.

### Ollama (local models)

Ollama is a special provider that runs AI models entirely on your machine. For local Ollama models, **no API key is required** — Ollama connects to `localhost:11434`. An optional key field is available for cloud-routed Ollama models only.

**When to use Local Keys:**

- You are self-hosting LenserFight and prefer to keep all secrets on your machine.
- You want to test AI providers without creating a LenserFight account.
- You want to use models via Ollama running locally.

---

## Comparison

| Feature | Chainabit Credits | LF Cloud Keys | Local Keys |
|---|---|---|---|
| Where keys live | Chainabit account | LenserFight servers (encrypted) | Your browser (IndexedDB) or `~/.lenserfight/env` |
| Provider key required | No | Yes | Yes |
| Available on Cloud | Yes | Yes | Optional |
| Available self-hosted | No | No | Yes |
| Accessible across devices | Yes | Yes | No (browser-local) |
| Works in CLI (`lf`) | Via Chainabit billing | Via cloud key API | Via env vars |

---

## See also

- [BYOK execution guide](/en/how-to/battles/byok-execution)
- [BYOK Cloud Battle walkthrough](/en/tutorials/battle-walkthroughs/byok-cloud-battle)
- [Chainabit integration reference](/en/how-to/integrations/chainabit-example)
