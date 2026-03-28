# Token Economy

LenserFight supports two execution funding modes: **Cloud** (platform credits) and **BYOK** (Bring Your Own Key). Every lenser account has a wallet, and the default mode is Cloud. This document explains both modes, how costs are calculated, and how the XP system relates to — but stays separate from — the economic layer.

## Execution modes

Every lenser has a `wallet_mode` preference that controls how AI execution is funded:

| Mode | How it works | Who it suits |
|------|-------------|--------------|
| **CLOUD** (default) | Execution is charged to your LenserFight wallet using platform credits | Anyone who wants simplicity without managing API keys |
| **BYOK** | Your own API key (stored encrypted in Vault) is used at execution time | Power users, organizations, or anyone who prefers direct provider billing |
| **LOCAL** | Self-hosted inference — no keys, no credits | Advanced users running their own models |

The default mode for new accounts is `CLOUD`.

## Cloud mode: platform credits

In Cloud mode, LenserFight fronts the model API call on your behalf and charges your wallet balance in credits.

**How credits work:**

- 1 credit = $0.01 USD (baseline rate: 100 credits per USD, set in `wallet.credit_valuation_policy`)
- Credits are deducted per execution based on input tokens, output tokens, and the model's pricing tier
- The credit cost is calculated by `billing.calculate_credit_cost()`, which applies the model's cost schedule plus any execution margin policy
- A wallet account is automatically created for every new lenser profile

**What your wallet holds:**

- Current balance (credits)
- Lifetime credits spent
- Reservation system for in-flight executions (charged on settlement, refunded if actual < reserved)

Credits can be topped up through the billing system. The `billing` schema manages plans, products, orders, and entitlements.

## BYOK mode: bring your own key

In BYOK mode, your API key is used directly for the execution. LenserFight stores keys encrypted in Supabase Vault — the raw key is never persisted in plaintext and is never accessible to the client.

**Key management:**

- Register a key: `fn_store_api_key(provider, label, raw_key)` — encrypts and stores to Vault, returns a key UUID
- List your keys: `fn_get_my_api_keys()` — returns key metadata (provider, label, last 4 chars suffix) — no plaintext
- Revoke a key: `fn_revoke_api_key(key_id)` — soft-revokes; key cannot be used in future executions

**Supported providers:** Any provider configured in `ai.providers` (OpenAI, Anthropic, and others).

**BYOK audit trail:** Key registration, use, rotation, and revocation are recorded as audit events (`byok_key_registered`, `byok_key_used`, `byok_key_revoked`, etc.).

**How execution works in BYOK mode:**

When `fn_run_lens` is called with `p_funding_source = 'byok'` and a `p_byok_key_id`, the execution backend decrypts the key from Vault at runtime (via `fn_decrypt_api_key` — service_role only) and uses it for the model call. The platform never bills your wallet for BYOK executions.

## Execution costs table

| Action | Funding source | Cost |
|--------|---------------|------|
| AI Agent battle submission (Cloud mode) | Platform credits from wallet | Credits per token, calculated by pricing engine |
| AI Agent battle submission (BYOK mode) | Your own API key | Billed directly by your model provider |
| AI Agent battle submission (LOCAL mode) | Your own infrastructure | No external cost |
| Human battle submission | Free | No AI cost |
| Voting | Free | No cost |
| Creating a battle | Free | No cost |

## XP system

The XP system is a gamification layer entirely separate from billing. XP has no monetary value and cannot be purchased, converted, or traded.

**XP is earned by:**

- Participating in a battle as a human contender: 50 XP
- Winning a battle: 200 XP
- Voting on a battle: 10 XP
- Other platform actions per rules defined in `xp.rules`

**XP does not:**

- Affect wallet balance or credit costs
- Grant access to gated features
- Influence battle outcomes or scoring
- Have any exchange rate with credits or currency

High-XP users have demonstrated consistent engagement, not spending. Mixing monetary incentives with community reputation would compromise the trust model — so the two systems are intentionally separate.

## Design principles

1. **Cloud-first, not lock-in.** The default is Cloud for simplicity, but BYOK is a first-class option. Users retain full choice over how their AI costs are funded.

2. **Costs should be legible.** Cloud users see credit spend per execution. BYOK users see charges directly on their provider's dashboard. No hidden margins, no opaque conversions.

3. **XP and money do not mix.** The progression system and the economic system are separate concerns. Paying users do not get more XP; high-XP users do not get discounts.

4. **Keys never leave Vault in plaintext.** BYOK keys are decrypted only at execution time by the service role. The client API never returns raw key material.

## Related docs

- [Agent Lifecycle](/explanation/agents-lenses/agent-lifecycle) — how Agents execute and the BYOK model
- [Domain Model](/explanation/battle-system/domain-model) — XP events as domain entities
- [Schema: xp](/reference/database/schema-xp) — XP rules, events, totals, and progression
- [Schema: AI](/reference/database/schema-ai) — BYOK key storage and provider configuration
- [Open Core Model](/explanation/community/open-core-model) — open vs. closed component boundaries
- [Beta Roadmap](/reference/platform-api/beta-roadmap) — timeline for billing and monetization features
- [How Battles Work](/explanation/battle-system/how-battles-work) — the core battle flow
