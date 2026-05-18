---
title: Personality Profile drawer
description: Define a named behavioral preset — tone, expertise, risk tolerance, autonomy level, communication style, decision style, escalation behavior, and a system-prompt patch.
---

# Personality Profile drawer

Opened from the [Personality Section](../personality).

## Fields

| Field | Options | Effect |
|---|---|---|
| **Name** | free text | Label for the variant — e.g. *Debate strategist*, *Cautious analyst* |
| **Tone** | decisive · curious · reserved · playful · formal | Affects phrasing and assertiveness in every response |
| **Expertise** | novice · generalist · specialist · principal | How the agent frames explanations — plain language vs. deep domain assumed |
| **Risk** | conservative · moderate · aggressive | How boldly the agent acts under uncertainty |
| **Autonomy** | observed · guided · autonomous | Gate density — *observed* requests approval constantly; *autonomous* runs within its budget |
| **Communication** | concise · detailed · explanatory | Output verbosity — *concise* minimises words; *explanatory* adds rationale |
| **Decision** | evidence_first · speed_first · balanced | Whether the agent waits for full analysis or optimises for throughput |
| **Escalation behavior** | ask_when_blocked · never · always_for_writes | What happens when the agent hits a blocker or a write action |
| **System prompt patch** | free text | Appended verbatim to the system prompt when this profile is active |

## Why profiles?

Multiple profiles can coexist — only one is active at a time. Profiles let you:

- A/B two personalities across campaigns without touching workflow logic.
- Swap between a conservative and aggressive mode at schedule time.
- Audit which personality was active during a specific run (stored in the run record).

## System prompt patch tips

- Keep it to 1–3 focused sentences.
- Avoid duplicating instructions already in the workflow.
- Treat it as a personality *override*, not a full system prompt.

## Side effects

- Promoting a profile to active demotes the previous one in the same transaction.
- Emits `personality.activated` in the [Logs section](../logs).
- The active profile's patch is visible in the Run Detail drawer under "System context".

## Related

- [Personality Section](../personality)
- [Manage Agent Settings — Personality](/en/how-to/agents/manage-agent-settings#step-2-personality-instruction-lens)
- [Autonomous Agent OS](/en/explanation/agents/autonomous-agent-os)
