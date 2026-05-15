---
title: Models Section
description: Browse and bind model profiles — the unit workflows reference when they need to call an AI provider.
---

# Models Section

**Route:** `/lenser/<handle>/ag/models`

Workflows do **not** hard-code provider/model ids. Instead they reference a **model profile** — a stable name that pins a provider, model id, and decoding defaults. The Models section is where you create, edit, and promote these profiles.

## Why profiles?

- **Stable contracts** — swapping the underlying model is one rebind, not a workflow rewrite.
- **Cost ceiling** — temperature, max-tokens, and top-p are pinned per profile, so a misconfigured run can't blow the budget.
- **Reuse** — the same profile can be referenced by multiple workflows.

## Default profile

Exactly **one** profile per agent is marked default. Promoting another profile demotes the previous one in a single transaction. Workflows that don't override the binding fall back to the default.

## Fields per profile

| Field | Validation |
|---|---|
| Name | unique within agent |
| Provider | from the provider catalogue |
| Model id | validated against the provider's manifest |
| Temperature | 0.0 – 2.0 |
| top_p | 0.0 – 1.0 |
| max_tokens | provider-bounded |
| Default | exactly one per agent |


## Code-backed workflow

Source of truth: ModelsSection.tsx and BindModelDrawer.tsx. The implementation creates default profiles, deletes profiles, compares catalog entries, and opens the drawer for profile edits.

1. Create a model profile for each runtime posture you need, such as fast, careful, or cheap.
2. Keep exactly one default profile available for workflow nodes that do not override the model.
3. Use catalog pricing and capability information before selecting a model id.
4. Delete unused profiles only after checking workflow assignments and schedules.

Verification: run a workflow using the profile, then inspect [Analytics](./analytics) and [Cost](./cost) for latency and spend.

## Related

- [Bind Model drawer](./drawers/bind-model)
- [Providers Section](./providers)
- [AI Providers](/en/reference/ai-providers)
