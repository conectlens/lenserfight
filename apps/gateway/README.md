# `apps/gateway` — `lf-gatewayd`

The LenserFight Trust Gateway daemon. One instance per device.

## Binaries

| Binary | Role |
|--------|------|
| `lf-gatewayd` | Long-running daemon. Hosts loopback HTTP/WS, runs heartbeat / outbox / pull / lease loops. |
| `lf-gateway-init` | One-shot bootstrapper. Creates the Ed25519 keypair, registers the device, writes daemon-side state. |

## Usage

```bash
# First-time setup (writes Ed25519 key to OS keychain, registers the device).
nx run gateway:build-init && node dist/apps/gateway/init.js

# Start the daemon.
nx run gateway:build && node dist/apps/gateway/main.js

# Or via the CLI:
lf gateway serve
```

## Refusal preconditions

The daemon refuses to start if any of:

- clock skew > 5 minutes vs Supabase,
- no Ed25519 key reachable in the OS keychain,
- no Supabase session,
- owner Lenser is paused,
- workspace `global_kill_switch=true`,
- `service_role` key is present in the runtime environment.

## See also

- [RFC-0003 §8](../../docs/rfcs/RFC-0003-trust-gateway.md#8-daemon-appsgateway)
- [Gateway Architecture](../../docs/explanation/gateway/architecture.md)
- [`lf gateway` CLI Reference](../../docs/reference/cli/gateway.md)
