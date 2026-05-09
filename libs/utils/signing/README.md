# `@lenserfight/utils/signing`

Pure-Node Ed25519 signing primitives for the LenserFight Trust Gateway (LTG).

This library provides:

- **`canonicalize`** — JSON Canonicalization Scheme (RFC 8785) for stable JSON serialization.
- **`generateNonce`** — 128-bit cryptographically random nonce, base64url encoded.
- **`generateEd25519Keypair`** — Ed25519 keypair generator using `node:crypto`.
- **`signEnvelope`** / **`verifyEnvelope`** — sign / verify a `SignedEnvelope` per RFC-0003 §3.

The library is **pure** (no I/O, no DOM, no keychain access). Private key bytes are passed in by the caller; key storage lives in [`@lenserfight/utils/keychain`](../keychain/README.md).

## Usage

```ts
import {
  generateEd25519Keypair,
  signEnvelope,
  verifyEnvelope,
} from '@lenserfight/utils/signing'

const { publicKey, privateKey } = generateEd25519Keypair()
const envelope = signEnvelope(privateKey, 'device-uuid', { hello: 'world' })
const result = verifyEnvelope(publicKey, envelope)
// → { ok: true } or { ok: false, reason: 'signature_mismatch' | 'iat_window' | ... }
```

## Spec

See [RFC-0003 §3](../../../docs/rfcs/RFC-0003-trust-gateway.md#3-signed-envelope) and [security-rules R3](../../../docs/explanation/gateway/security-rules.md#r3--signed-envelopes).
