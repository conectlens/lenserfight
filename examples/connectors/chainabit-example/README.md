# Chainabit Connector Example

**Chainabit** is the private commercial API platform that powers [lenserfight.com](https://lenserfight.com). It is closed-source and not part of this repository. This example shows how an external service integrates with LenserFight's public connector SDK — Chainabit is used here as the reference implementor because it is the canonical consumer of the connector interface.

Reference integration for LenserFight connectors. Demonstrates the full lifecycle:

```bash
lenserfight connectors add chainabit \
  --name "Chainabit" \
  --slug chainabit \
  --scopes lenses:read

lenserfight connectors test chainabit
```

## Setup

```bash
cp .env.example .env
# paste the service token printed by `connectors add` into LENSERFIGHT_SERVICE_TOKEN
pnpm install
pnpm demo
```

The demo:

1. Registers a `chainabit` adapter in the connector registry.
2. Verifies the service token against the registered adapter.
3. Dispatches a `lens.published` event to the configured webhook endpoint.

## Files

- [src/adapter.ts](src/adapter.ts) — minimal `ConnectorAdapterV1` wrapping the built-in `HttpConnectorAdapter`.
- [src/index.ts](src/index.ts) — runnable demo flow.

## Token rotation

```bash
lenserfight connectors rotate chainabit
```

The previous token is revoked immediately. Update `LENSERFIGHT_SERVICE_TOKEN` and re-run the demo.

## Reference

- [docs/en/reference/connectors/](../../../docs/en/reference/connectors/index.md)
- [docs/en/how-to/integrations/build-an-adapter.md](../../../docs/en/how-to/integrations/build-an-adapter.md)
- [docs/en/rfcs/RFC-0001-connector-interface.md](../../../docs/en/rfcs/RFC-0001-connector-interface.md)
