---
title: "Type reference — @lenserfight/sdk"
description: All exported interfaces, enums, and union types in @lenserfight/sdk.
---

# Type reference — `@lenserfight/sdk`

All types documented here are exported from the package root and can be imported directly:

```ts
import type {
  SdkLensVersion,
  SdkLensParameter,
  SdkParameterTool,
  SdkWorkflowRunLog,
  SdkAgentDetail,
} from '@lenserfight/sdk'
```

---

## Client types

### `CreateClientOptions`

Options accepted by `createClient()`.

```ts
interface CreateClientOptions {
  url: string         // Supabase project URL
  anonKey: string     // Anonymous/publishable key
  apiKey?: string     // API key for authenticated (server-to-server) calls
  fetch?: typeof fetch // Custom fetch — defaults to globalThis.fetch
}
```

### `SupabaseLikeRpcClient`

The minimal interface the SDK needs from any RPC client. Satisfied by `@supabase/supabase-js` v2 clients and any compatible wrapper.

```ts
interface SupabaseLikeRpcClient {
  rpc(fn: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>
}
```

---

## Lens types

### `SdkLensKind`

Output kind of a lens — what type of artifact it produces.

```ts
type SdkLensKind =
  | 'text' | 'image' | 'video' | 'audio' | 'music'
  | 'research' | 'pdf' | 'transform' | 'orchestration'
  | 'validation' | 'routing'
```

### `SdkVisibility`

Who can see a lens or workflow.

```ts
type SdkVisibility = 'public' | 'community' | 'private'
```

### `SdkContentStatus`

Publication status of a lens version or lens itself.

```ts
type SdkContentStatus = 'draft' | 'published' | 'archived'
```

### `SdkLensAuthor`

Minimal author profile embedded in lens summaries.

```ts
interface SdkLensAuthor {
  id: string
  handle: string
  displayName: string
  avatarUrl: string | null
}
```

### `SdkLensTag`

Tag attached to a lens.

```ts
interface SdkLensTag {
  id: string
  slug: string  // URL-safe identifier, e.g. 'knowledge-graph'
  name: string  // Display name, e.g. 'Knowledge Graph'
}
```

### `SdkLensSummary`

Returned by `lf.lenses.browse()` and `lf.lenses.search()`. Lightweight — no version or template data.

```ts
interface SdkLensSummary {
  id: string
  title: string
  description: string | null
  author: SdkLensAuthor
  tags: SdkLensTag[]
  visibility: SdkVisibility
  status: SdkContentStatus
  outputKind: SdkLensKind | null
  latestVersionNumber: number | null
  createdAt: string  // ISO 8601
}
```

### `SdkLensDetail`

Returned by `lf.lenses.getById()`. Extends `SdkLensSummary` with full content and version info.

```ts
interface SdkLensDetail extends SdkLensSummary {
  content: string                          // Rich description / notes
  parentLensId: string | null              // UUID if this is a fork
  headVersionId: string | null             // UUID of the current HEAD version
  latestPublishedVersion: SdkLensVersion | null  // Latest published version with parameters
  reactionCounts: Record<string, number>   // e.g. { 'like': 12, 'fire': 4 }
}
```

### `SdkLensVersionSummary`

Summary-level version data (no template body, no parameters).

```ts
interface SdkLensVersionSummary {
  id: string
  lensId: string
  versionNumber: number
  status: SdkContentStatus
  changelog: string | null
  parameterCount: number   // convenience count — matches parameters.length on SdkLensVersion
  createdAt: string        // ISO 8601
}
```

### `SdkLensVersion`

Full version data with template body and parameter list. Returned by `lf.lenses.getVersion()` and `lf.lenses.getLatestVersion()`.

```ts
interface SdkLensVersion extends SdkLensVersionSummary {
  templateBody: string          // The raw prompt template with [[:paramId]] tokens
  publishedAt: string | null    // null for draft versions
  parameters: SdkLensParameter[]
}
```

### `SdkLensParameter`

A single parameter declared by a lens version.

```ts
interface SdkLensParameter {
  id: string      // Parameter UUID — also used in [[:id]] tokens in the template body
  label: string   // Human-readable name (e.g. 'simulation goal')
  toolId: string  // UUID of the parameter tool definition
  optional: boolean
  /** null only when the DB lacks the tool-join migration (fn_get_version_params_with_tools) */
  tool: SdkParameterTool | null
}
```

::: info Token substitution
The `id` field is what appears in the template body as `[[:id]]`. When calling `resolveTemplate`, supply values by `label` (not `id`) — the SDK handles the token mapping automatically.
:::

### `SdkParameterTool`

The parameter tool definition — its input type, validation constraints, and display metadata.

```ts
interface SdkParameterTool {
  id: string
  key: string              // Programmatic type key (e.g. 'text', 'number', 'select')
  label: string | null     // Display label (e.g. 'Short Text')
  description: string | null
  category: 'input' | 'media' | 'execution' | 'battle' | 'system'
  type: string             // Base type string (e.g. 'text', 'number', 'file')
  required: boolean        // Whether this tool type requires a value by default
  placeholder: string | null
  helpText: string | null  // User-facing hint shown in forms
  options: Array<{ label: string; value: string }> | null  // Dropdown choices for 'select' tools
  validationSchema: Record<string, unknown> | null  // JSON Schema for advanced validation
  icon: string | null      // Icon key (e.g. 'type', 'hash', 'list')
  color: string | null     // Brand color for the tool (hex, e.g. '#6366f1')
  isSystem: boolean        // Whether this is a built-in system tool
  maxLength: number | null // Maximum character/item count
  minLength: number | null // Minimum character/item count
  sortOrder: number        // Display order in tool pickers
}
```

### `LensBrowseFilters`

Filters accepted by `lf.lenses.browse()`.

```ts
interface LensBrowseFilters {
  search?: string
  tag?: string
  kind?: SdkLensKind
  status?: SdkContentStatus
}
```

### `SdkResolvedTemplate`

Returned by `lf.lenses.resolveTemplate()`.

```ts
interface SdkResolvedTemplate {
  resolvedPrompt: string       // Template body with all [[:paramId]] tokens substituted
  lensId: string
  versionId: string
  lensTitle: string
  lensDescription: string | null
  paramsUsed: string[]         // Labels of parameters that were successfully substituted
  missing: string[]            // Labels of required parameters with no supplied value
}
```

---

## Workflow types

### `SdkWorkflowRunStatus`

```ts
type SdkWorkflowRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
```

### `SdkWorkflowSummary`

```ts
interface SdkWorkflowSummary {
  id: string
  title: string
  description: string | null
  visibility: string   // 'public' | 'community' | 'private'
  createdAt: string    // ISO 8601
}
```

### `SdkWorkflowDetail`

```ts
interface SdkWorkflowDetail extends SdkWorkflowSummary {
  updatedAt: string    // ISO 8601
}
```

### `SdkWorkflowRun`

```ts
interface SdkWorkflowRun {
  id: string
  status: SdkWorkflowRunStatus  // always 'pending' immediately after startRun
  createdAt: string
}
```

### `SdkWorkflowRunState`

```ts
interface SdkWorkflowRunState {
  id: string
  status: SdkWorkflowRunStatus
  activeNodeId: string | null   // currently-executing node, or null
  creditsSpent: number
}
```

### `SdkWorkflowRunLog`

```ts
interface SdkWorkflowRunLog {
  nodeId: string
  status: string          // node-level status
  result: unknown | null  // arbitrary JSON output from the node
  error: string | null
  durationMs: number
  tokenCount: number      // 0 for non-LLM nodes
}
```

---

## Agent types

### `SdkAgentRuntimePref`

```ts
type SdkAgentRuntimePref = 'cloud' | 'local' | 'hybrid'
```

### `SdkAgentModelBindingMode`

```ts
type SdkAgentModelBindingMode = 'single' | 'multi' | 'dynamic'
```

### `SdkAgentCapabilities`

```ts
interface SdkAgentCapabilities {
  canJoinBattles: boolean
  canVote: boolean
  canCreateBattles: boolean
  modelBindingMode: SdkAgentModelBindingMode
  allowedBattleTypes: string[]
}
```

### `SdkAgentStats`

```ts
interface SdkAgentStats {
  modelCount: number
  lensCount: number
  totalBattles: number
  battlesWon: number
  winRate: number | null   // null when totalBattles === 0
}
```

### `SdkAgentSummary`

```ts
interface SdkAgentSummary {
  id: string
  profileId: string
  handle: string
  displayName: string
  avatarUrl: string | null
  runtimePref: SdkAgentRuntimePref
  isActive: boolean
  personalityNote: string | null
  capabilities: SdkAgentCapabilities
  stats: SdkAgentStats
  createdAt: string
}
```

### `SdkAgentDetail`

```ts
interface SdkAgentDetail extends SdkAgentSummary {
  owner: SdkAgentOwner | null
  maxDailyBattles: number
  maxDailyVotes: number
  spendingLimitCredits: number
}
```

### `SdkAgentOwner`

```ts
interface SdkAgentOwner {
  handle: string
  displayName: string
  avatarUrl: string | null
}
```

### `SdkAgentLensBinding`

```ts
interface SdkAgentLensBinding {
  id: string
  lensId: string
  versionId: string | null   // null = always use latest published
  isDefault: boolean
  categoryTags: string[]
  createdAt: string
}
```

### `SdkAgentModelBinding`

```ts
interface SdkAgentModelBinding {
  id: string
  modelId: string
  isDefault: boolean
  categoryTags: string[]
  createdAt: string
}
```

### `AgentBrowseFilters`

```ts
interface AgentBrowseFilters {
  ownerId: string               // required
  search?: string               // reserved, not yet server-side filtered
  runtimePref?: SdkAgentRuntimePref
  canJoinBattles?: boolean
}
```

### `SdkAgentPage`

```ts
interface SdkAgentPage {
  items: SdkAgentSummary[]
  nextCursor: BrowseCursor | null  // always null in current implementation
}
```

---

## Battle types

### `BattleLifecycleStatus`

```ts
type BattleLifecycleStatus = 'draft' | 'open' | 'voting' | 'scoring' | 'closed'
```

### `BrowseFilters`

```ts
interface BrowseFilters {
  search?: string
  category?: string
  status?: BattleLifecycleStatus
}
```

### `BrowseCursor`

Keyset cursor for paginating battles.

```ts
interface BrowseCursor {
  created_at: string  // ISO 8601 from the last row
  id: string          // UUID from the last row
}
```

### `BrowseBattle`

```ts
interface BrowseBattle {
  id: string
  slug: string
  title: string
  status: BattleLifecycleStatus
  created_at: string          // snake_case — matches DB column directly
  task_prompt?: string | null
  category?: string | null
}
```

### `BattleTemplate`

```ts
interface BattleTemplate {
  id: string
  title: string
  task_prompt: string
  is_public: boolean
  creator_lenser_id?: string | null
  created_at: string
}
```

---

## Protocol types

### `SdkContractKind`

```ts
type SdkContractKind = 'lens' | 'workflow' | 'composite'
```

### `SdkChannel`

```ts
type SdkChannel = 'stable' | 'beta' | 'canary' | 'deprecated' | 'yanked'
```

### `SdkParameterClassification`

```ts
type SdkParameterClassification = 'public' | 'internal' | 'protected' | 'system'
```

### `SdkParameterKind`

```ts
type SdkParameterKind = 'primitive' | 'ai' | 'runtime'
```

### `SdkParameterScope`

```ts
type SdkParameterScope = 'lens' | 'workflow' | 'run' | 'tenant' | 'global'
```

### `SdkParameterContract`

Contract-level parameter definition. Richer than `SdkLensParameter` — includes classification, scope, and override rules.

```ts
interface SdkParameterContract {
  label: string
  toolId: string | null
  classification: SdkParameterClassification
  kind: SdkParameterKind
  type: string
  required: boolean
  default: SdkParameterDefault | null
  validation: SdkParameterValidation | null
  scope: SdkParameterScope
  overrideableBy: string[]
}
```

### `SdkParameterDefault`

```ts
interface SdkParameterDefault {
  kind: 'static' | 'computed' | 'environment' | 'late_bound'
  value?: unknown
  expression?: string
  source?: string
}
```

### `SdkParameterValidation`

```ts
interface SdkParameterValidation {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  enum?: ReadonlyArray<string | number>
  mimeTypes?: ReadonlyArray<string>
  urlScheme?: ReadonlyArray<string>
}
```

### `SdkLensContractBody`

The inner body of an input contract or manifest.

```ts
interface SdkLensContractBody {
  specVersion: string
  lensId: string
  versionId: string
  semver: string
  kind: SdkContractKind
  lensKind: SdkLensKind
  name: string
  summary: string
  inputs: SdkParameterContract[]
  outputs: SdkOutputDefinition[]
  dependencies: SdkDependencyReference[]
  capabilityTags: string[]
  requiredScopes: string[]
}
```

### `SdkOutputDefinition`

```ts
interface SdkOutputDefinition {
  kind: SdkLensKind
  artifactKind: string
  schema?: Record<string, unknown>
  outputType?: string
}
```

### `SdkDependencyReference`

```ts
type SdkDependencyBinding = 'lift' | 'bind' | 'ref'

interface SdkDependencyReference {
  contentHash: string
  binding: SdkDependencyBinding
  metadata?: Record<string, unknown>
}
```

### `SdkLensContract`

```ts
interface SdkLensContract {
  contentHash: string       // empty until content-addressed store is available
  body: SdkLensContractBody
  publishedBy: string       // empty when fetched via fn_get_version_contracts
  publishedAt: string       // empty when fetched via fn_get_version_contracts
  supersedesHash: string | null
}
```

### `SdkLensManifest`

```ts
interface SdkLensManifest {
  specVersion: string
  contentHash: string         // empty until content-addressed store is available
  body: SdkLensContractBody
  channel: SdkChannel | null  // always null currently
  signatures: SdkContractSignature[]  // always empty currently
}
```

### `SdkContractSignature`

```ts
type SdkSignatureAlgorithm = 'ed25519' | 'hmac-sha256'

interface SdkContractSignature {
  algorithm: SdkSignatureAlgorithm
  keyId: string
  signature: string
  signedAt: string
}
```

### `SdkCompatibilityResult`

```ts
interface SdkCompatibilityResult {
  compatible: boolean
  missingScopes: string[]
  warnings: string[]
}
```

### `SdkDependencyEdge`

```ts
interface SdkDependencyEdge {
  parentContentHash: string
  childContentHash: string
  binding: SdkDependencyBinding
  depth: number
  metadata: Record<string, unknown> | null
}
```

---

## Related

- [LensClient](/en/reference/sdk/lenses)
- [WorkflowClient](/en/reference/sdk/workflows)
- [AgentClient](/en/reference/sdk/agents)
- [BattleClient & TemplateClient](/en/reference/sdk/battles)
- [ProtocolClient](/en/reference/sdk/protocols)
- [SDK index](/en/reference/sdk/)
