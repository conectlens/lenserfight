---
title: Configure Provider drawer
description: Bind credentials and region for a single AI provider. Credentials are encrypted at rest; only the last 4 characters are echoed back after save.
---

# Configure Provider drawer

Opened from the [Providers Section](../providers).

## Fields

| Field | Required | Notes |
|---|---|---|
| **API key** | yes | Write-only; only last 4 chars are displayed after save |
| **Region** | conditional | Required for residency-aware providers (Azure, Bedrock) |
| **Default model** | no | Fallback when a workflow does not pick one |

## Security

- Plaintext key never leaves the form — it's encrypted before persistence.
- Ciphertext + fingerprint stored; decryption happens only inside the gateway egress process.
- Audit log records each rotation (who, when) in the [Logs section](../logs).

## Health check

After save, the drawer triggers a synchronous health check against the provider. A failure surfaces a row badge in [Providers](../providers) but does not roll back the save — you can have a configured-but-unreachable provider while you debug.


## Code-backed workflow

Source of truth: ConfigureProviderDrawer.tsx.

1. Configure provider credentials, region, and default model for the selected provider row.
2. Use Test before or after saving to confirm provider reachability.
3. Verify provider status in Providers and check Logs if the health test fails.

## Related

- [Providers Section](../providers)
- [BYOK Section](../byok)
