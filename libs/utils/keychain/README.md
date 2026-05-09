# `@lenserfight/utils/keychain`

OS keychain abstraction for the LenserFight Trust Gateway (LTG).

Provides a small, pluggable interface used by `apps/gateway` and the CLI to read and write the device's Ed25519 private key without ever serializing it to disk.

## Backends

| Backend | Used when | Notes |
|---------|-----------|-------|
| `keytar` | macOS, Linux (libsecret), Windows (Credential Manager) | Default. Lazy-imported so web bundles don't pull native deps. |
| File fallback | Only when `LF_GATEWAY_KEY_FILE_FALLBACK=1` | Stores under `~/.lenserfight/gateway/keys/<service>__<account>` mode `0600`. Intended for CI. Logs a warning. |

## API

```ts
import { keychain } from '@lenserfight/utils/keychain'

await keychain.setSecret({ service: 'lenserfight-gateway', account: 'device:abc', secret })
const value = await keychain.getSecret({ service: 'lenserfight-gateway', account: 'device:abc' })
await keychain.deleteSecret({ service: 'lenserfight-gateway', account: 'device:abc' })
const all = await keychain.findAccounts({ service: 'lenserfight-gateway' })
```

## Spec

See [security-rules R5](../../../docs/explanation/gateway/security-rules.md#r5--secret-handling) and [requirements CO-3 / SH-1](../../../docs/explanation/gateway/requirements.md).
