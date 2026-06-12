---
title: "LensClient — @lenserfight/sdk"
description: Full reference for lf.lenses — browse, search, fetch, resolve, and validate lens templates.
---

# `LensClient` — `lf.lenses`

Provides read access to public lenses, their versions, parameters, and prompt templates. All methods require an **authenticated client** (pass `apiKey` to `createClient`) unless otherwise noted, because the underlying `fn_mcp_*` RPCs are not accessible to the anonymous role.

```ts
import { createClient } from '@lenserfight/sdk'

const lf = createClient({
  url: process.env.LF_URL!,
  anonKey: process.env.LF_ANON_KEY!,
  apiKey: process.env.LF_API_KEY!,
})
```

---

## `lf.lenses.browse(filters?, offset?, limit?)`

List public lenses with optional filtering. Calls `fn_mcp_lens_list` when no `search` filter is set, and `fn_mcp_lens_search` when `search` is provided.

**Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `filters` | `LensBrowseFilters` | `{}` | Optional filter object. See below. |
| `offset` | `number` | `0` | Number of records to skip. |
| `limit` | `number` | `20` | Maximum records to return. Clamped to `[1, 100]`. |

**`LensBrowseFilters`**

| Field | Type | Description |
|---|---|---|
| `search` | `string` | Full-text search across lens titles and descriptions. Switches the underlying RPC from `fn_mcp_lens_list` to `fn_mcp_lens_search`. |
| `status` | `SdkContentStatus` | Filter by publication status: `'draft'`, `'published'`, or `'archived'`. |
| `tag` | `string` | Filter by tag slug. |
| `kind` | `SdkLensKind` | Filter by output kind: `'text'`, `'image'`, `'video'`, `'audio'`, `'research'`, etc. |

**Returns** `Promise<SdkLensSummary[]>`

```ts
// All published lenses, first page
const lenses = await lf.lenses.browse({ status: 'published' }, 0, 20)

// Full-text search
const results = await lf.lenses.search('neural network', {}, 0, 10)

// Second page
const page2 = await lf.lenses.browse({}, 20, 20)
```

**`SdkLensSummary`** — see [Type reference](/en/reference/sdk/types#sdklenssummary).

---

## `lf.lenses.search(query, filters?, offset?, limit?)`

Full-text search across public lenses. Convenience wrapper — equivalent to `browse({ ...filters, search: query }, offset, limit)`.

**Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | — | Search string. |
| `filters` | `Omit<LensBrowseFilters, 'search'>` | `{}` | Additional filters (excluding `search`). |
| `offset` | `number` | `0` | Records to skip. |
| `limit` | `number` | `20` | Max records. Clamped to `[1, 100]`. |

**Returns** `Promise<SdkLensSummary[]>`

```ts
const hits = await lf.lenses.search('knowledge graph', { status: 'published' })
```

---

## `lf.lenses.getById(lensId)`

Fetch full lens detail — author, tags, reaction counts, and the latest published version. Calls `fn_get_lens_detail_bootstrap`.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `lensId` | `string` | UUID of the lens. |

**Returns** `Promise<SdkLensDetail | null>`

Returns `null` if the lens does not exist or is not accessible to the caller.

```ts
const lens = await lf.lenses.getById('ce03998d-62d2-442c-b654-db607f4844e8')
if (!lens) {
  console.log('not found or not accessible')
} else {
  console.log(lens.title, lens.headVersionId)
}
```

**`SdkLensDetail`** — see [Type reference](/en/reference/sdk/types#sdklensdetail).

---

## `lf.lenses.getVersion(versionId)`

Fetch a specific lens version with its **full parameter list and tool details**. Fires two RPCs in parallel: `fn_get_lens_version_detail` (version metadata + template body) and `fn_get_lens_version_parameters` (parameters with tool definitions).

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `versionId` | `string` | UUID of the specific lens version. |

**Returns** `Promise<SdkLensVersion | null>`

Returns `null` when:
- The version does not exist.
- The version is a `draft` and the caller is not the owner.
- A public lens version is not in `published` status.

Throws if either underlying RPC fails.

```ts
const version = await lf.lenses.getVersion('ea385bee-762c-4c39-9eb7-c405c0e1965c')
if (version) {
  console.log(version.versionNumber)  // e.g. 1
  console.log(version.status)         // 'draft' | 'published' | 'archived'
  console.log(version.templateBody)   // the raw prompt template with [[:paramId]] tokens
  console.log(version.parameters)     // SdkLensParameter[]
  for (const p of version.parameters) {
    console.log(p.label, p.optional, p.tool?.key)
  }
}
```

**`SdkLensVersion`** — see [Type reference](/en/reference/sdk/types#sdklensversion).

---

## `lf.lenses.getLatestVersion(lensId)`

Resolve the HEAD (latest) version of a lens by lens ID, then return it with full parameters. Uses `fn_get_lens_detail_bootstrap` to look up `head_version_id`, then delegates to `getVersion()`.

This is the preferred method when you have a `lensId` but not a `versionId`.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `lensId` | `string` | UUID of the lens. |

**Returns** `Promise<SdkLensVersion | null>`

Returns `null` if the lens is not found, not accessible, or has no head version set.

```ts
const version = await lf.lenses.getLatestVersion('ce03998d-62d2-442c-b654-db607f4844e8')
if (version) {
  console.log(`v${version.versionNumber} — ${version.status}`)
  console.log(`Template body: ${version.templateBody.slice(0, 80)}…`)
  console.log(`Parameters (${version.parameterCount}):`)
  for (const p of version.parameters) {
    const req = p.optional ? 'optional' : 'required'
    console.log(`  [${req}] ${p.label} (tool: ${p.tool?.key ?? 'unknown'})`)
  }
}
```

::: tip
Prefer `getLatestVersion(lensId)` over `getById(lensId)` + `getVersion(versionId)` — it handles the `head_version_id` resolution for you and always returns a fully mapped, camelCase-keyed object.
:::

---

## `lf.lenses.resolveTemplate(lensId, params, options?)`

Resolve a lens template by substituting `[[:paramId]]` tokens with caller-supplied values (matched by parameter label, case-insensitive). Returns the filled prompt and diagnostics showing which parameters were used and which were missing.

Calls `fn_mcp_lens_resolve_template`.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `lensId` | `string` | UUID of the lens to resolve. |
| `params` | `Record<string, string>` | Key-value pairs where keys are parameter labels (case-insensitive) and values are the substitution strings. |
| `options` | `{ versionId?: string }` | Optional. If `versionId` is omitted the server resolves the latest published version. |

**Returns** `Promise<SdkResolvedTemplate>`

```ts
const result = await lf.lenses.resolveTemplate(
  'ce03998d-62d2-442c-b654-db607f4844e8',
  {
    'simulation goal': 'Model the spread of information in social networks',
    'source pdfs': 'paper1.pdf, paper2.pdf',
    // 'visual style' is optional — will be stripped from the template
  },
)

console.log(result.resolvedPrompt)   // the filled prompt string
console.log(result.paramsUsed)       // ['simulation goal', 'source pdfs']
console.log(result.missing)          // [] — no required params missing
```

If required parameters are missing from `params`, they appear in `result.missing` but the call **does not throw**. It is up to the caller to decide whether to proceed or prompt the user.

**`SdkResolvedTemplate`**

| Field | Type | Description |
|---|---|---|
| `resolvedPrompt` | `string` | The template body with all tokens substituted. Optional tokens with no value are replaced with an empty string. |
| `lensId` | `string` | UUID of the lens. |
| `versionId` | `string` | UUID of the version that was resolved. |
| `lensTitle` | `string` | Display title of the lens. |
| `lensDescription` | `string \| null` | Description, if set. |
| `paramsUsed` | `string[]` | Labels of parameters whose values were substituted. |
| `missing` | `string[]` | Labels of required parameters that had no supplied value. |

---

## `lf.lenses.getParameterContracts(versionId)`

Fetch the raw parameter contract array from a version's `input_contract`. Calls `fn_get_version_contracts`.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `versionId` | `string` | UUID of the lens version. |

**Returns** `Promise<SdkParameterContract[]>`

Returns an empty array if the version has no contracts or is inaccessible.

```ts
const contracts = await lf.lenses.getParameterContracts(versionId)
for (const c of contracts) {
  console.log(c.label, c.required, c.type)
}
```

---

## `lf.lenses.extractParams(versionId)`

Convenience wrapper around `getParameterContracts`. Returns both the full contract objects and a plain array of their labels.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `versionId` | `string` | UUID of the lens version. |

**Returns** `Promise<{ params: SdkParameterContract[], labels: string[] }>`

```ts
const { params, labels } = await lf.lenses.extractParams(versionId)
console.log('Parameter labels:', labels)  // ['simulation goal', 'source pdfs', 'visual style']
```

---

## `lf.lenses.validateParams(versionId, values)`

Validate a set of caller-supplied values against a version's parameter contracts. Checks for missing required parameters and unknown keys. Does **not** validate value types or lengths — that is enforced server-side during execution.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `versionId` | `string` | UUID of the lens version. |
| `values` | `Record<string, string>` | Key-value pairs to validate (keys are parameter labels, case-insensitive). |

**Returns**

```ts
Promise<{
  valid: boolean      // true only when missing.length === 0 && unknown.length === 0
  missing: string[]   // required parameter labels with no supplied value
  unknown: string[]   // supplied keys that don't match any contract label
  total: number       // total number of parameters in the contract
  provided: number    // number of keys in `values`
}>
```

```ts
const check = await lf.lenses.validateParams(versionId, {
  'simulation goal': 'AI alignment',
  'extra key': 'unexpected',
})

if (!check.valid) {
  if (check.missing.length) console.error('Missing required:', check.missing)
  if (check.unknown.length) console.warn('Unknown params:', check.unknown)
} else {
  // safe to call resolveTemplate
}
```

---

## Full example — discover and run a lens

```ts
import { createClient } from '@lenserfight/sdk'

const lf = createClient({
  url: process.env.LF_URL!,
  anonKey: process.env.LF_ANON_KEY!,
  apiKey: process.env.LF_API_KEY!,
})

// 1. Find a lens by search
const [lens] = await lf.lenses.search('knowledge graph neural')
if (!lens) throw new Error('No lens found')

// 2. Get its latest version with full parameter details
const version = await lf.lenses.getLatestVersion(lens.id)
if (!version) throw new Error('No published version')

// 3. Show what the lens expects
console.log(`Lens: ${lens.title}  v${version.versionNumber}  (${version.status})`)
for (const p of version.parameters) {
  const marker = p.optional ? '[optional]' : '[required]'
  console.log(`  ${marker} ${p.label}`)
  if (p.tool) {
    console.log(`    type: ${p.tool.type}, maxLength: ${p.tool.maxLength ?? 'unlimited'}`)
  }
}

// 4. Validate before resolving
const myInputs = { 'simulation goal': 'Spread of AI adoption', 'source pdfs': 'report.pdf' }
const check = await lf.lenses.validateParams(version.id, myInputs)
if (!check.valid) throw new Error(`Missing: ${check.missing.join(', ')}`)

// 5. Resolve the template
const resolved = await lf.lenses.resolveTemplate(lens.id, myInputs, { versionId: version.id })
console.log('\nResolved prompt:\n', resolved.resolvedPrompt)
```

---

## Related

- [Type reference — Lens types](/en/reference/sdk/types#lens-types)
- [ProtocolClient](/en/reference/sdk/protocols) — deeper contract and manifest access
- [SDK index](/en/reference/sdk/)
