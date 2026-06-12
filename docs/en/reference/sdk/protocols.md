---
title: "ProtocolClient — @lenserfight/sdk"
description: Full reference for lf.protocols — fetch input contracts, manifests, and compatibility checks for lens versions.
---

# `ProtocolClient` — `lf.protocols`

Inspect the formal **input contract** (parameter schema) and **manifest** for a lens version. Contracts define what parameters a version expects — their types, classifications, scopes, and validation rules.

All methods that hit the database require an **authenticated client** (`apiKey` in `createClient`).

---

## `lf.protocols.getContractByVersion(versionId)`

Fetch the input contract for a lens version. Calls `fn_get_version_contracts` and returns the `input_contract` field.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `versionId` | `string` | UUID of the lens version. |

**Returns** `Promise<SdkLensContract | null>`

Returns `null` if the version is not found or has no contract.

::: warning Partial contract
`contentHash`, `publishedBy`, and `publishedAt` are **not available** from `fn_get_version_contracts` — these fields are empty strings on the returned object. Only `body` is populated. Use `getManifest` if you need the full body structure.
:::

```ts
const contract = await lf.protocols.getContractByVersion(versionId)
if (contract) {
  console.log('Spec version:', contract.body.specVersion)
  console.log('Required scopes:', contract.body.requiredScopes)
  for (const input of contract.body.inputs) {
    console.log(`  ${input.label} [${input.type}] required=${input.required}`)
  }
}
```

**`SdkLensContract`**

| Field | Type | Description |
|---|---|---|
| `contentHash` | `string` | Content-addressed hash. Empty string when fetched via `fn_get_version_contracts`. |
| `body` | `SdkLensContractBody` | The contract body — spec version, inputs, outputs, dependencies, scopes. |
| `publishedBy` | `string` | Publisher identifier. Empty string when fetched via `fn_get_version_contracts`. |
| `publishedAt` | `string` | ISO 8601 timestamp. Empty string when fetched via `fn_get_version_contracts`. |
| `supersedesHash` | `string \| null` | Hash of the contract this one supersedes. |

**`SdkLensContractBody`** — see [Type reference](/en/reference/sdk/types#sdklenscontractbody).

---

## `lf.protocols.getContractByHash(_contentHash)`

Hash-based lookup. **Not implemented** — the current DB schema does not support content-hash lookups. Always returns `null`.

```ts
const contract = await lf.protocols.getContractByHash('sha256:abc...')
// always null
```

This method exists to satisfy the protocol interface. It will be implemented once a content-addressed store is added. Avoid depending on it returning non-null values.

---

## `lf.protocols.getManifest(versionId)`

Get the manifest for a lens version. Built from `fn_get_version_contracts`. The manifest wraps the contract body and adds channel and signature metadata — however, **channel and signatures are not yet available** and will be `null`/empty.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `versionId` | `string` | UUID of the lens version. |

**Returns** `Promise<SdkLensManifest | null>`

```ts
const manifest = await lf.protocols.getManifest(versionId)
if (manifest) {
  console.log('Spec version:', manifest.specVersion)
  console.log('Content hash:', manifest.contentHash || '(not set)')
  console.log('Channel:', manifest.channel || 'none')
  console.log('Signatures:', manifest.signatures.length)
}
```

**`SdkLensManifest`**

| Field | Type | Description |
|---|---|---|
| `specVersion` | `string` | Protocol spec version (e.g. `'1.0.0'`). |
| `contentHash` | `string` | Content hash. Empty string until content-addressed store is available. |
| `body` | `SdkLensContractBody` | Same body as in `SdkLensContract`. |
| `channel` | `SdkChannel \| null` | Release channel. Currently always `null`. |
| `signatures` | `SdkContractSignature[]` | Cryptographic signatures. Currently always empty. |

---

## `lf.protocols.getDependencies(_contentHash)`

Fetch the dependency graph edges for a given content hash. **Not implemented** — always returns an empty array. Reserved for a future content-addressed dependency graph.

```ts
const deps = await lf.protocols.getDependencies('sha256:abc...')
// always []
```

---

## `lf.protocols.checkCompatibility(versionId, requiredScopes)`

Check whether a lens version's contract satisfies a set of required capability scopes. Fetches the contract via `getContractByVersion` and performs a **client-side** set comparison.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `versionId` | `string` | UUID of the lens version to check. |
| `requiredScopes` | `string[]` | Scope strings that the contract must declare (e.g. `['read:files', 'execute:code']`). |

**Returns** `Promise<SdkCompatibilityResult>`

```ts
const result = await lf.protocols.checkCompatibility(versionId, ['read:documents', 'write:output'])
if (result.compatible) {
  console.log('All required scopes satisfied')
} else {
  console.warn('Missing scopes:', result.missingScopes)
  console.warn('Warnings:', result.warnings)
}
```

**`SdkCompatibilityResult`**

| Field | Type | Description |
|---|---|---|
| `compatible` | `boolean` | `true` if all `requiredScopes` are present in the contract's `requiredScopes` array. |
| `missingScopes` | `string[]` | Required scopes that are absent from the contract. Empty when `compatible` is `true`. |
| `warnings` | `string[]` | Non-fatal issues (e.g. `'Contract not found'`). |

::: info Scope semantics
Scope matching is a simple `Array.includes` check on the strings returned by the contract. The LenserFight platform does not enforce a hierarchical scope model at this time — `'read:documents'` and `'read'` are treated as different strings.
:::

---

## When to use `ProtocolClient` vs `LensClient`

| Goal | Use |
|---|---|
| Get lens parameters for a user-facing form | `lf.lenses.getLatestVersion(lensId)` |
| Validate user input against parameter requirements | `lf.lenses.validateParams(versionId, values)` |
| Inspect raw parameter contracts (type, classification, scope) | `lf.protocols.getContractByVersion(versionId)` |
| Check whether a lens supports specific capabilities | `lf.protocols.checkCompatibility(versionId, scopes)` |
| Build a connector that needs to declare its supported scopes | `lf.protocols.getManifest(versionId)` |

---

## Related

- [Type reference — Protocol types](/en/reference/sdk/types#protocol-types)
- [LensClient](/en/reference/sdk/lenses)
- [SDK index](/en/reference/sdk/)
