---
title: Namespace Governance Architecture
description: How LenserFight protects strategic handles, prevents impersonation, and governs the identity namespace across the LenserFight, Chainabit, and ConectLens ecosystems.
---

# Namespace Governance Architecture

The namespace governance system replaces the eight-entry hardcoded `CHECK` constraint on `lensers.profiles` with a policy-driven, data-governed authority that protects strategic handles, blocks impersonation, and requires **zero code changes** to protect newly discovered AI providers or models.

## Core idea

Every handle claim goes through a single validation authority before it reaches the database. New providers and models are **data rows**, not code deployments.

```
Handle claim attempt
  │
  ▼
identity_gov.fn_validate_handle(candidate)
  │
  ├─ [1] Syntax guard (length, charset)
  ├─ [2] Normalizer  (NFKC → leet fold → repeat collapse → filler strip)
  ├─ [3] Exact registry hit
  ├─ [4] Prefix / suffix / regex pattern match
  ├─ [5] Token + modifier composition check
  ├─ [6] Homoglyph skeleton probe (TR-39)
  ├─ [7] Levenshtein fuzzy probe (edit distance ≤ 2)
  ├─ [8] Trigram similarity probe (pg_trgm > 0.70)
  └─ [9] Phonetic probe (Double-Metaphone)
         │
         ▼
    verdict: allow | escalate | deny
```

Fail-CLOSED: on any internal exception, the function returns `deny`. Ecosystem safety is never traded for onboarding convenience.

## The one table

```sql
identity_gov.reserved_namespaces (
  entry_kind  exact | prefix | suffix | token | regex
  value       pre-normalized string or POSIX pattern
  class       system | security | provider | model | future | verified_only | restricted
  deny_score  0..100  (floor risk score when this entry matches)
  source      canonical | manifest | ai_inferred
  expires_at  NULL = permanent; set for ai_inferred during 30-day grace window
)
```

One table replaces seven draft tables and a family of CHECK constraints. Combinatorial coverage (e.g. `openai-support`, `openai-bot`, `openai-admin`) is achieved by `token` entries combined with the modifier list inside `fn_validate_handle` — no row explosion.

## Namespace classification

| Class | Score | Examples | Who can claim |
|-------|-------|----------|---------------|
| `system` | 100 | lenserfight, chainabit | Never claimable |
| `security` | 95 | admin, mod, abuse, trust | Internal ops only |
| `provider` | 90 | openai, anthropic, google | DNS proof + trademark |
| `model` | 85 | claude, gpt, gemini, llama | Provider-verified only |
| `future` | 80 | lenscore, lensruntime, lenso | Held for roadmap products |
| `verified_only` | 70 | Notable public figures | T&S approval |
| `restricted` | 50 | Pattern-flagged via suffix/token | Appeal-only |
| `public` | — | Everything else | Self-serve |

## Protected handles (canonical seed)

The following handles are seeded into `identity_gov.reserved_namespaces` at bootstrap. All values are pre-normalized (lowercase, ASCII-clean). Combinatorial coverage (e.g. `openai-support`, `claude-bot`) is achieved via `prefix` and `token` entries, not row explosion.

### System / platform identities — score 100

| Handle | Entry kinds | Why |
|--------|-------------|-----|
| `lenserfight` | exact, prefix | Platform canonical identity; no variant may be claimed |
| `chainabit` | exact, prefix | Chainabit ecosystem identity |
| `conectlens` | exact, prefix | ConectLens parent brand |
| `lenserfight-hq` | exact | Platform HQ handle |

### Security / moderation — score 90–95

These handles exist to prevent impersonation of platform operations roles.

| Handle | Score | Why |
|--------|-------|-----|
| `admin` | 95 | Platform admin namespace |
| `root` | 95 | System root namespace |
| `system` | 95 | System identity namespace |
| `moderator` | 95 | Moderation team namespace |
| `mod` | 95 | Short moderation namespace |
| `trust` | 95 | Trust & Safety namespace |
| `safety` | 95 | Safety team namespace |
| `abuse` | 95 | Abuse reporting namespace |
| `report` | 95 | Report namespace |
| `security` | 95 | Security team namespace |
| `support` | 95 | Platform support namespace |
| `null` | 95 | Null/undefined identity guard |
| `undefined` | 95 | Undefined guard |
| `help` | 90 | Help namespace |
| `policy` | 90 | Policy namespace |
| `legal` | 90 | Legal namespace |
| `dmca` | 90 | DMCA reporting namespace |
| `anonymous` | 90 | Anonymous identity guard |

### LenserFight brand family — score 80

Reserved for current and future platform products. No user may claim a `lens*` or `lola` handle without T&S approval.

| Handle | Why |
|--------|-----|
| `lenser` | LenserFight core brand token (also a token entry) |
| `lens` | Core brand token (also a token entry) |
| `lenso` | Lenser AI family — @lenso |
| `lensa` | Lenser AI family — @lensa |
| `lense` | Lenser AI family — @lense |
| `lola` | Lenser AI family — @lola (also a token entry) |
| `lenscore` | Future product: LensCore |
| `lensruntime` | Future product: LensRuntime |
| `lensagent` | Future product: LensAgent |
| `lensos` | Future product: LensOS |
| `lensai` | Future product: LensAI |
| `lensinfra` | Future product: LensInfra |
| `lensizm` | Legacy reserved handle |

Chainabit ecosystem handles reserved for future products:

| Handle | Why |
|--------|-----|
| `chaina` | Chainabit brand token (also a token entry) |
| `chaincore` | Future: ChainCore |
| `chainagent` | Future: ChainAgent |
| `chainruntime` | Future: ChainRuntime |
| `chainnode` | Future: ChainNode |
| `chainlabs` | Future: ChainLabs |
| `chaininfra` | Future: ChainInfra |

### AI provider companies — score 85–90

Blocked to prevent trademark impersonation. Exact + prefix + token entries provide combinatorial coverage.

| Handle | Score | Source |
|--------|-------|--------|
| `openai` | 90 | OpenAI (trademark) |
| `anthropic` | 90 | Anthropic PBC (trademark) |
| `google` | 90 | Google LLC (trademark) |
| `deepmind` | 90 | Google DeepMind |
| `meta` | 90 | Meta Platforms |
| `xai` | 90 | xAI |
| `mistral` | 90 | Mistral AI |
| `deepseek` | 90 | DeepSeek AI |
| `groq` | 90 | Groq Inc. |
| `cohere` | 90 | Cohere Inc. |
| `perplexity` | 90 | Perplexity AI |
| `huggingface` | 90 | HuggingFace Inc. |
| `stabilityai` | 90 | Stability AI |
| `elevenlabs` | 90 | ElevenLabs |
| `nvidia` | 90 | NVIDIA Corp. |
| `microsoft` | 90 | Microsoft Corp. |
| `amazon` | 90 | Amazon/AWS |
| `vertexai` | 90 | Google Vertex AI |
| `geminiapi` | 90 | Google Gemini API |
| `togetherai` | 90 | Together AI |
| `together` | 85 | Together AI (short form) |
| `stability` | 85 | Stability AI (short form) |
| `replicate` | 85 | Replicate Inc. |
| `bedrock` | 85 | AWS Bedrock |
| `sagemaker` | 85 | AWS SageMaker |
| `fireworks` | 85 | Fireworks AI |
| `octoai` | 85 | OctoAI |
| `anyscale` | 85 | Anyscale |
| `cerebras` | 85 | Cerebras Systems |

### AI model names — score 75–90

Blocked to prevent model impersonation. Provider-verified accounts may petition T&S for access.

| Handle | Score | Why |
|--------|-------|-----|
| `chatgpt` | 90 | ChatGPT product name |
| `claude` | 90 | Anthropic Claude |
| `gemini` | 90 | Google Gemini |
| `grok` | 90 | xAI Grok |
| `gpt4o` | 85 | GPT-4o |
| `gpt4` | 85 | GPT-4 |
| `gpt3` | 85 | GPT-3 |
| `gpt` | 85 | OpenAI GPT family |
| `llama` | 85 | Meta Llama family |
| `deepseekr1` | 85 | DeepSeek-R1 |
| `sonnet` | 85 | Claude Sonnet tier |
| `opus` | 85 | Claude Opus tier |
| `sora` | 85 | OpenAI Sora |
| `commandr` | 80 | Cohere Command-R |
| `qwen` | 80 | Alibaba Qwen |
| `phi` | 80 | Microsoft Phi |
| `haiku` | 80 | Claude Haiku tier |
| `gemma` | 80 | Google Gemma |
| `mixtral` | 80 | Mistral Mixtral |
| `codex` | 80 | OpenAI Codex |
| `dalle` | 80 | OpenAI DALL-E (slug) |
| `dall-e` | 80 | OpenAI DALL-E |
| `stable-diffusion` | 80 | Stability AI SD |
| `whisper` | 80 | OpenAI Whisper |
| `mistral7b` | 80 | Mistral 7B |
| `o1` | 80 | OpenAI o1 |
| `sdxl` | 75 | Stable Diffusion XL |
| `falcon` | 75 | TII Falcon |

### Suffix / composition guards — score 50

These entries block impersonation patterns like `mybot-official` or `something-admin`. Score is lower because the tokens may appear legitimately in non-impersonation handles; the composition check in `fn_validate_handle` handles high-risk combinations.

| Suffix | Why |
|--------|-----|
| `official` | Impersonation suffix guard |
| `verified` | Impersonation suffix guard |
| `iam` | Identity claim suffix guard |

## Detection pipeline detail

### [2] Normalizer — `identity_gov.fn_normalize_handle`

The IMMUTABLE normalizer reduces attack surface before any registry lookup:

1. Strip invisible/directional Unicode (ZWJ, ZWNJ, RTL marks, BOM)
2. NFKC normalization (ligatures: `ﬁ→fi`, fullwidth: `Ａ→A`)
3. Casefold (`lower()`)
4. Homoglyph fold — Cyrillic а/е/о/р/с/х → a/e/o/p/c/x
5. Leet-speak fold — `0→o`, `1→l`, `3→e`, `4→a`, `5→s`, `7→t`, `@→a`, `$→s`, `8→b`
6. Repeat collapse — runs of 3+ identical chars → 2 (`ooopenai→oopenai`)
7. Filler suffix strip — `official`, `support`, `admin`, `bot`, `ai`, `hq`, `team`…
8. Leading `the_` / `the-` strip
9. Trim separator chars

`openai-support` → `openai` → exact hit → deny.

### [6] Homoglyph skeleton — `identity_gov.fn_handle_skeleton`

Applied on top of the normalizer. Collapses font-level confusables:
`rn→m`, `vv→w`, `ii→u`. Detects `rneta` → `meta`.

### [5] Composition check

If any `token` entry appears inside the normalized handle **and** the original candidate contains a modifier word, the handle is denied:

```
lens_ai   → token 'lens' + modifier 'ai' → deny
gpt-admin → token 'gpt'  + modifier 'admin' → deny
claude-bot → token 'claude' + modifier 'bot' → deny
```

Modifier list lives in the function. Adding a new modifier is a single-line code change; adding a new protected token is a single row insert.

## Functions (public API surface)

| Function | Volatility | Caller | Purpose |
|----------|-----------|--------|---------|
| `public.fn_check_handle(text)` | STABLE | authenticated, anon | Advisory read-through; safe for debounced UI calls |
| `identity_gov.fn_validate_handle(text)` | STABLE | trigger, fn_check_handle | Authoritative 9-step pipeline |
| `identity_gov.fn_normalize_handle(text)` | IMMUTABLE | fn_validate_handle | Pure normalizer |
| `identity_gov.fn_handle_skeleton(text)` | IMMUTABLE | fn_validate_handle | Homoglyph folder |

`fn_check_handle` is advisory — it is cached and safe to call from UI on every keystroke (debounced). The `BEFORE INSERT/UPDATE` trigger on `lensers.profiles` runs `fn_validate_handle` as the hard enforcement gate. Cache staleness can never produce a wrongful approval on the write path.

## Security model

- `identity_gov` schema has `FORCE ROW LEVEL SECURITY` on all tables.
- `authenticated` and `anon` roles have SELECT only on `reserved_namespaces`.
- All write mutations go through `SECURITY DEFINER` functions with `SET search_path = ''`.
- The trigger on `lensers.profiles` raises `P0001` on deny — no bypass through direct SQL.
- A superuser/service_role can still insert rows (seeding, moderation) — the trigger only fires for client roles.

## Adding new providers or models

No code change needed. Insert a row:

```sql
INSERT INTO identity_gov.reserved_namespaces
  (entry_kind, value, class, deny_score, reason, source)
VALUES
  ('exact',  'newprovider',  'provider', 90, 'NewProvider Inc.', 'manifest'),
  ('prefix', 'newprovider',  'provider', 90, 'Prefix guard',     'manifest'),
  ('token',  'newprovider',  'provider', 90, 'Composition guard','manifest');
```

For `ai_inferred` entries (from the future AI Intel pipeline), set `expires_at = now() + interval '30 days'`. Entries that are not promoted within the grace window expire and become claimable again.

## GRASP / OOAD alignment

| Principle | Application |
|-----------|-------------|
| Information Expert | `identity_gov` owns all normalization, detection, and decision logic |
| Protected Variations | New providers/models are data rows — the variation point is closed to code change |
| Pure Fabrication | `fn_normalize_handle`, `fn_handle_skeleton` are stateless services |
| Controller | `fn_validate_handle` is the single validation authority |
| Low Coupling | `lensers.profiles` trigger delegates entirely to `fn_validate_handle` |
| Chain of Responsibility | 9-step pipeline; each step is independent, first terminal verdict wins |
| Registry | `reserved_namespaces` is the canonical registry |
| Strategy | `entry_kind` column selects the matching strategy at runtime |
| Specification | Each probe is a self-contained boolean sub-query |

## Tables introduced

| Table | Purpose |
|-------|---------|
| `identity_gov.reserved_namespaces` | The single registry — exact handles, prefix/suffix/token/regex rules |

One schema, one table. No audit tables, no policy tables — the governance logic is pure SQL functions backed by Postgres extension capabilities (`pg_trgm`, `fuzzystrmatch`).

## Related

- [RFC-0005: Namespace Governance](../../rfcs/RFC-0005-namespace-governance.md)
- [Lenser Family](../lensers/family/)
- [AI Cost Governance & BYOK](./cost-governance.md)
