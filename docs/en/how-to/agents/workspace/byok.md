---
title: BYOK Section
description: Bring-Your-Own-Key management. Keys are encrypted at rest, never echoed in full, and can be capped per month or rotated on demand.
---

# BYOK Section

**Route:** `/lenser/<handle>/ag/byok`

BYOK ("Bring Your Own Key") lets the agent call AI providers using **your** API credentials. The platform never proxies your raw key — the gateway holds ciphertext + fingerprint and decrypts only inside the egress process.

## What the section shows

- **Keys table** — provider, fingerprint, status, monthly soft cap.
- **Add key** — opens the Configure Provider drawer scoped to this agent.
- **Rotate** — replaces the ciphertext in-place; existing scheduled runs see the new key on next dispatch.
- **Usage log** — last 50 calls (drill in via the [BYOK Usage Log](./byok-usage-log)).

## Monthly cap

Each key may declare a **monthly soft cap** in credits. When exceeded:

1. New calls return `byok_cap_exceeded`.
2. The run is marked `blocked`.
3. A notification fires to the owner.

Reset is automatic at UTC midnight on the first of the month.

## Security guarantees

- Ciphertext + fingerprint only — plaintext is never persisted.
- Last-4 display only.
- Audit log every read (Logs section).


## Code-backed workflow

Source of truth: ByokSection.tsx. The implementation lists key hints, rotation-due keys, registers new provider keys, and revokes provider keys through agentWorkspaceService.

1. Choose the provider before entering a key. The provider is part of the storage and revoke contract.
2. Add a label or hint that helps identify the key without exposing the secret.
3. Save the key once. The UI only works with hints after registration.
4. Revoke and re-register when rotating a provider credential.

Verification: use [BYOK Usage Log](./byok-usage-log) for recent calls and [Cost](./cost) for spend after the key is used.

## Related

- [BYOK Usage Log](./byok-usage-log)
- [Configure Provider drawer](./drawers/configure-provider)
