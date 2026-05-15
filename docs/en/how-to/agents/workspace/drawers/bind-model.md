---
title: Bind Model drawer
description: Create or edit a model profile — the binding unit workflows reference when calling an AI provider.
---

# Bind Model drawer

Opened from the [Models Section](../models).

## Fields

| Field | Validation |
|---|---|
| **Name** | Unique within the agent |
| **Provider** | From provider catalogue |
| **Model id** | Validated against provider manifest |
| **Temperature** | 0.0 – 2.0 |
| **top_p** | 0.0 – 1.0 |
| **max_tokens** | Provider-bounded |
| **Default** | Exactly one profile per agent |

## Promotion semantics

When you mark a profile **Default = on** and save, the previously-default profile is demoted in the same transaction. There is never more than one default.

## Why the decoding defaults?

Temperature, top_p, and max_tokens are pinned **per profile** so a workflow can't accidentally swing them. If you need two creativity settings, create two profiles (e.g., *Conservative*, *Creative*) and bind workflows to the right one.


## Code-backed workflow

Source of truth: BindModelDrawer.tsx.

1. Create or edit model profile fields: name, provider, model id, temperature, top_p, max_tokens, and default flag.
2. Default promotion demotes the previous default in the same save path.
3. Verify the profile in Models, then run a small workflow and inspect Analytics and Cost.

## Related

- [Models Section](../models)
- [Configure Provider drawer](./configure-provider)
- [AI Providers](/en/reference/ai-providers)
