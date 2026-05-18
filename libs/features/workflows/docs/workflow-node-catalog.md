# LenserFight Workflow Node Catalog

**Version:** CN–CR expansion · 95 nodes · 11 categories

The catalog is the single source of truth for every node available in the Workflow Studio. It powers the palette, edge validation, command search, config forms, n8n export, and execution routing.

**Source files:**
- Authoritative catalog: `libs/infra/execution/src/lib/catalog/workflow-node-catalog.ts`
- UI catalog: `libs/features/workflows/src/lib/catalog/workflow-node-catalog.ts`
- Config descriptors: `libs/features/workflows/src/lib/config/descriptors/`
- Runners: `libs/infra/execution/src/lib/runners/`

---

## Categories

| # | Category | Key | Count | Description |
|---|----------|-----|-------|-------------|
| 1 | Lens | `lens` | 1 | Core AI model invocation |
| 2 | Trigger | `trigger` | 5 | Workflow entry points |
| 3 | Logic | `logic` | 11 | Flow control and branching |
| 4 | Data | `data` | 10 | Data transformation and shaping |
| 5 | AI Primitive | `ai_primitive` | 16 | LLM, embedding, memory, and chain ops |
| 6 | Battle / Arena | `battle` | 7 | Arena creation, execution, and scoring |
| 7 | Storage & I/O | `storage` | 12 | Databases, files, HTTP, and KV store |
| 8 | Communication | `communication` | 6 | Email, Slack, Discord, Telegram, push, SMS |
| 9 | Integration | `integration` | 12 | GitHub, Notion, Calendar, Linear, Jira, Sheets |
| 10 | Media | `media` | 8 | Image, audio, video, and speech generation |
| 11 | Utility | `utility` | 8 | Logging, caching, retries, and secrets |

---

## IO Type Compatibility

Edge validation uses `areWorkflowNodesCompatible(sourceType, targetType)`. The rule is: if the target accepts `any`, every source is compatible. Otherwise the source's output type must appear in the target's `acceptsInputTypes`.

| IO Type | Meaning |
|---------|---------|
| `text` | Plain or markdown string |
| `json` | Structured JSON object |
| `array` | JSON array |
| `number` | Numeric scalar |
| `boolean` | True / false |
| `object` | Untyped object (pass-through) |
| `image` | Binary image (URL or base64) |
| `audio` | Binary audio (URL or base64) |
| `video` | Binary video (URL) |
| `file` | Generic file blob |
| `embedding` | Float vector (dense embedding) |
| `document[]` | Array of chunked text documents |
| `battle_result` | Structured battle outcome |
| `lens_result` | Structured lens execution result |
| `agent_result` | Structured agent execution result |
| `workflow_result` | Structured sub-workflow result |
| `error` | Execution error envelope |
| `void` | No input required (triggers only) |
| `any` | Accepts any upstream type |

**Key incompatibility rules:**
- `embedding` output **cannot** wire directly to `email_send` or `slack_notify` — embed → `data_mapper` or `output_parser` first
- `battle_result` can only feed `judge_battle`, `score_aggregator`, `leaderboard_update`, and `data_mapper`
- `image`/`audio`/`video` outputs only feed media consumers or `file_reader` / `data_mapper`

---

## Category 1: Lens

### `lens` — Lens Invocation

| | |
|-|-|
| **Purpose** | Execute a LenserFight lens prompt against an AI model with parameter overrides and funding selection. |
| **Inputs** | `text`, `json`, `object` |
| **Outputs** | `text` — generated response |
| **Required Config** | `model_id` — AI model key (e.g. `openai:gpt-4.1-mini`) |
| **Optional Config** | `param_overrides` (JSON), `funding_source` (`platform_credit` \| `user_byok_cloud` \| `user_byok_local`) |
| **Execution Notes** | Executed directly by `WorkflowExecutionService` via `resolveLensTemplate`, not the runner registry. Supports BYOK and budget reconciliation. |

**Example Configuration:**
```json
{
  "model_id": "openai:gpt-4.1-mini",
  "funding_source": "platform_credit",
  "param_overrides": { "tone": "concise" }
}
```
**Expected Input:** `{ "text": "Summarize this week of arena results." }`
**Expected Output:** `{ "text": "Weekly digest with top contenders, outliers, and recommended rematches." }`
**Downstream:** `email_send` (body: `$.text`)

**Common Valid Connections:**
- `prompt_template` → `lens` → `output_parser`
- `rag_retrieval` → `lens` → `email_send`
- `lens_execute` (sub-lens) feeds `lens` via memory chain

**Common Invalid Connections:**
- `embedding` → `lens` (embedding is float vector, lens expects text/json)
- `lens` → `embedding` (embedding expects `document[]`)

---

## Category 2: Trigger

All trigger nodes have **no upstream inputs** (use a void sentinel). They must be the first node in a workflow.

### `manual_trigger`

| | |
|-|-|
| **Purpose** | Start a workflow on demand with optional typed root inputs. |
| **Outputs** | `json` — `{ rootInputs: { query, payload } }` |
| **Optional Config** | `inputSchema` — JSON schema for the manual input form |
| **n8n Equivalent** | `n8n-nodes-base.manualTrigger` |

**Example:**
```json
{ "inputSchema": { "query": { "type": "string", "required": true } } }
```
**Output:** `{ "rootInputs": { "query": "Which battle strategy won most often this week?" } }`
**Downstream:** `rag_retrieval` (`query: $.rootInputs.query`)

---

### `schedule_trigger`

| | |
|-|-|
| **Purpose** | Fire a workflow on a cron schedule. |
| **Outputs** | `json` — `{ firedAt, timezone }` |
| **Required Config** | `cron` — cron expression (min interval: `*/5`) |
| **Optional Config** | `timezone` (IANA, default `UTC`) |
| **Environments** | `scheduled`, `worker`, `server` |
| **n8n Equivalent** | `n8n-nodes-base.scheduleTrigger` |

**Example:**
```json
{ "cron": "0 8 * * MON", "timezone": "Europe/Istanbul" }
```
**Output:** `{ "firedAt": "2026-05-18T08:00:00+03:00", "timezone": "Europe/Istanbul" }`
**Downstream:** `supabase_query` (`since: $.firedAt`)

---

### `webhook_trigger`

| | |
|-|-|
| **Purpose** | Receive an inbound HTTP request and expose its body, headers, and method. |
| **Outputs** | `json` — `{ body, headers, method }` |
| **Required Config** | `path` — public webhook path |
| **Optional Config** | `method` (`POST` \| `GET` \| `PUT`, default `POST`) |
| **Environments** | `server`, `worker` |
| **n8n Equivalent** | `n8n-nodes-base.webhook` |

**Example:**
```json
{ "path": "/hooks/github-pr-review", "method": "POST", "secretRef": "github-webhook-secret" }
```
**Output:** `{ "body": { "action": "opened", "pull_request": { "number": 42 } } }`
**Downstream:** `github_pr_review` (`prNumber: $.body.pull_request.number`)

---

### `event_trigger`

| | |
|-|-|
| **Purpose** | Start a workflow from a LenserFight domain event (battle.completed, etc.). |
| **Outputs** | `json` — `{ eventType, entityId, payload }` |
| **Required Config** | `eventType` — domain event name |
| **Environments** | `worker`, `server` |
| **n8n Equivalent** | None (falls back to `noOp`) |

**Example:**
```json
{ "eventType": "battle.completed", "workspaceId": "{{workspace.id}}" }
```
**Output:** `{ "eventType": "battle.completed", "entityId": "battle_123", "payload": { "winner": "contender-a" } }`
**Downstream:** `slack_notify` (`text: $.payload.winner`)

---

### `form_input_trigger`

| | |
|-|-|
| **Purpose** | Start a workflow from a rendered form submission. |
| **Outputs** | `json` — `{ fields, submittedBy }` |
| **Required Config** | `fields` — form fields and validation rules |
| **n8n Equivalent** | `n8n-nodes-base.formTrigger` |

**Example:**
```json
{ "fields": [{ "key": "prompt", "type": "textarea", "required": true }] }
```
**Output:** `{ "fields": { "prompt": "Debate RAG answer style", "contenders": ["concise", "thorough"] } }`
**Downstream:** `battle_execute`

---

## Category 3: Logic

### `code` (existing)
Execute arbitrary JavaScript in a sandboxed environment. Accepts `any`, produces `any`.

### `switch` (existing)
Route to one of N branches based on a field value. Accepts `json`/`text`, produces `json`.

### `if_condition`

| | |
|-|-|
| **Purpose** | Binary branch: continue on true path, skip on false path. |
| **Required Config** | `field`, `operator` (`eq` \| `neq` \| `gt` \| `lt` \| `contains` \| `regex`), `value` |

**Example:**
```json
{ "field": "$.score", "operator": "gt", "value": 0.8 }
```
**Valid upstream:** `judge_evaluator`, `score_aggregator`, `data_mapper`

---

### `try_catch`

| | |
|-|-|
| **Purpose** | Wrap downstream nodes; route error to catch branch without halting the workflow. |
| **Required Config** | `catchBranch` — node ID to route errors to |

---

### `merge`

| | |
|-|-|
| **Purpose** | Combine outputs from multiple upstream branches into a single JSON envelope. |
| **Required Config** | `mode` — `append` \| `merge` \| `passthrough` |

---

### `split_in_batches`

| | |
|-|-|
| **Purpose** | Chunk a JSON array into batches and iterate. |
| **Required Config** | `batchSize` (1–100) |
| **Optional Config** | `field` — path to array within upstream JSON |

---

### `stop_return`

| | |
|-|-|
| **Purpose** | Terminate the workflow immediately and return a value as the final output. |
| **Optional Config** | `returnValue` — static value to return |

---

Other logic nodes: `loop_map` (iterate array), `wait_delay` (pause N seconds), `error_catch` (handle errors), `sub_workflow` (call another workflow).

---

## Category 4: Data

### `json_transform` (existing)
Apply jq-style expressions. Accepts `json`, produces `json`.

### `set_variables` (existing)
Set named workflow variables for downstream access. Accepts `any`, produces `json`.

### `extract_field`

| | |
|-|-|
| **Purpose** | Extract a single field from a JSON payload using a dot-path or JSONPath. |
| **Required Config** | `field` — path (e.g. `$.battle.winner`) |
| **Optional Config** | `outputKey` — key name in output object |

---

### `rename_field`

| | |
|-|-|
| **Purpose** | Rename keys in a JSON object. |
| **Required Config** | `mappings` — array of `{ from, to }` pairs |

---

### `filter_items`

| | |
|-|-|
| **Purpose** | Keep only array items matching a condition. |
| **Required Config** | `field`, `operator`, `value` |

---

### `aggregate`

| | |
|-|-|
| **Purpose** | Reduce an array to a scalar using sum, avg, min, max, count, or concat. |
| **Required Config** | `field` — numeric field path, `operation` |

---

### `sort`

| | |
|-|-|
| **Purpose** | Sort a JSON array by a field. |
| **Required Config** | `field`, `order` (`asc` \| `desc`) |

---

### `deduplicate`

| | |
|-|-|
| **Purpose** | Remove duplicate items from a JSON array by a key field. |
| **Required Config** | `key` — field used for uniqueness |

---

### `text_splitter`

| | |
|-|-|
| **Purpose** | Chunk a long text into overlapping segments for embedding or processing. |
| **Inputs** | `text` |
| **Outputs** | `document[]` |
| **Required Config** | `chunkSize` (50–4000 tokens), `chunkOverlap` |

---

### `data_mapper`

| | |
|-|-|
| **Purpose** | Map fields from one schema to another using templates and expressions. Universal bridge node. |
| **Inputs** | `any` |
| **Outputs** | `json` |
| **Required Config** | `mappings` — array of `{ target, source }` pairs |

**Example:**
```json
{ "mappings": [
  { "target": "title", "source": "$.battle.name" },
  { "target": "score", "source": "$.result.score" }
]}
```

---

## Category 5: AI Primitive

### `prompt_template` (existing)
Interpolate template variables into a prompt string.

### `output_parser` (existing)
Extract structured fields from LLM text output.

### `embedding` (existing)
Generate a dense vector embedding. Accepts `text` / `document[]`, produces `embedding`.

### `rag_retrieval` (existing)
Retrieve top-K similar chunks from a vector store. Accepts `embedding`, produces `document[]`.

### `judge_evaluator` (existing)
Score and rank LLM outputs against a rubric. Accepts `text`, produces `json`.

### `memory_read` / `memory_write` (existing)
Read or write named session memory. Full-text search supported via `fn_search_lenser_memory`.

### `chain` (existing)
Compose multiple AI steps into a sequential chain.

### `lens_execute`

| | |
|-|-|
| **Purpose** | Programmatically invoke a named lens by ID with dynamic inputs. Useful for nested lens composition. |
| **Inputs** | `text`, `json` |
| **Outputs** | `lens_result` — `{ text, metadata }` |
| **Required Config** | `lensId`, `modelId` |
| **Optional Config** | `versionId`, `paramOverrides` |

---

### `agent_execute`

| | |
|-|-|
| **Purpose** | Dispatch an autonomous agent with tools and a goal; collect the final result. |
| **Inputs** | `text`, `json` |
| **Outputs** | `agent_result` — `{ output, steps, toolCalls }` |
| **Required Config** | `agentId`, `goal` |

---

### `vector_search`

| | |
|-|-|
| **Purpose** | Search a vector index using a query embedding. |
| **Inputs** | `embedding`, `text` |
| **Outputs** | `document[]` |
| **Required Config** | `indexId`, `topK` |

---

### `summarizer`

| | |
|-|-|
| **Purpose** | Summarize long text using an LLM with a configurable style. |
| **Inputs** | `text`, `document[]` |
| **Outputs** | `text` |
| **Required Config** | `modelId`, `style` (`bullet` \| `paragraph` \| `headline`) |

---

### `classifier`

| | |
|-|-|
| **Purpose** | Classify text into one of N predefined labels. |
| **Inputs** | `text` |
| **Outputs** | `json` — `{ label, confidence }` |
| **Required Config** | `labels` (string array), `modelId` |

---

### `translator`

| | |
|-|-|
| **Purpose** | Translate text from one language to another. |
| **Inputs** | `text` |
| **Outputs** | `text` |
| **Required Config** | `targetLanguage` (BCP-47), `modelId` |

---

### `image_analyze`

| | |
|-|-|
| **Purpose** | Describe or analyze an image using a vision model. |
| **Inputs** | `image` |
| **Outputs** | `text` — analysis |
| **Required Config** | `modelId`, `prompt` |

---

### `audio_transcribe`

| | |
|-|-|
| **Purpose** | Transcribe an audio file to text (Whisper-compatible). |
| **Inputs** | `audio` |
| **Outputs** | `text` |
| **Required Config** | `modelId`, `language` (optional) |

---

### `video_analyze`

| | |
|-|-|
| **Purpose** | Describe or classify video content using a multimodal model. |
| **Inputs** | `video` |
| **Outputs** | `text` |
| **Required Config** | `modelId`, `prompt` |

---

## Category 6: Battle / Arena

### `battle_create`

| | |
|-|-|
| **Purpose** | Create a new battle in the LenserFight arena with contenders and a template. |
| **Inputs** | `json` |
| **Outputs** | `json` — `{ battleId, status }` |
| **Required Config** | `templateId`, `contenders` (array of lens IDs), `topic` |

**Example:**
```json
{ "templateId": "tmpl_debate_v2", "contenders": ["lens_concise", "lens_thorough"], "topic": "RAG answer quality" }
```

---

### `battle_execute`

| | |
|-|-|
| **Purpose** | Run a created battle and collect raw results. |
| **Inputs** | `json` — must include `battleId` |
| **Outputs** | `battle_result` |
| **Required Config** | `battleId` or upstream JSON with `battleId` field |

---

### `contender_run`

| | |
|-|-|
| **Purpose** | Execute a single contender lens within a battle context. |
| **Inputs** | `json` (battle context) |
| **Outputs** | `json` — `{ contenderId, output, durationMs }` |
| **Required Config** | `contenderId`, `battleId` |

---

### `judge_battle`

| | |
|-|-|
| **Purpose** | Invoke the AI judge to evaluate and rank contenders against a rubric. |
| **Inputs** | `battle_result` |
| **Outputs** | `json` — `{ rankings, scores, reasoning }` |
| **Required Config** | `rubric`, `judgeModelId` |
| **Optional Config** | `maxScore` (default 10) |

**Example:**
```json
{ "rubric": "Evaluate clarity, completeness, and accuracy.", "judgeModelId": "openai:gpt-4.1", "maxScore": 10 }
```
**Invalid upstream:** `text`, `embedding` (requires `battle_result`)

---

### `vote_collector`

| | |
|-|-|
| **Purpose** | Aggregate human votes for a battle (poll or pairwise comparison). |
| **Inputs** | `battle_result` |
| **Outputs** | `json` — `{ votes, breakdown }` |
| **Required Config** | `battleId`, `mode` (`poll` \| `pairwise`) |

---

### `score_aggregator`

| | |
|-|-|
| **Purpose** | Combine AI judge scores and human votes into a final ranking. |
| **Inputs** | `battle_result`, `json` |
| **Outputs** | `json` — `{ finalRanking, weightedScores }` |
| **Required Config** | `aiWeight` (0–1), `humanWeight` (0–1) |

---

### `leaderboard_update`

| | |
|-|-|
| **Purpose** | Push final scores to the arena leaderboard. |
| **Inputs** | `battle_result`, `json` |
| **Outputs** | `json` — `{ updated, leaderboardId }` |
| **Required Config** | `leaderboardId`, `seasonId` |

---

## Category 7: Storage & I/O

### `supabase_query` (existing)
Execute a whitelisted Supabase RPC. Accepts `json`, produces `json`.

### `kv_store_read` / `kv_store_write` (existing)
Read or write a workflow-scoped key-value entry.

### `file_reader` (existing)
Read a file from an allowed CDN URL.

### `file_writer` (existing)
Write content to a file output slot.

### `webhook_trigger` / `webhook_sender` (existing)
Webhook entry and outbound sender.

### `schedule_trigger` (existing)
Cron-based trigger.

### `sql_query`

| | |
|-|-|
| **Purpose** | Execute a parameterized SQL query against a connected database. |
| **Required Config** | `connectionId`, `query`, `params` |
| **Stub Status** | TODO: implement in runner |

---

### `object_storage_upload`

| | |
|-|-|
| **Purpose** | Upload a binary blob to object storage (S3-compatible). |
| **Inputs** | `file`, `image`, `audio`, `video` |
| **Required Config** | `bucket`, `key` |
| **Stub Status** | TODO: implement in runner |

---

### `object_storage_download`

| | |
|-|-|
| **Purpose** | Download a file from object storage by bucket and key. |
| **Outputs** | `file` |
| **Required Config** | `bucket`, `key` |
| **Stub Status** | TODO: implement in runner |

---

### `http_request`

| | |
|-|-|
| **Purpose** | Make an authenticated HTTP request to any public API. |
| **Inputs** | `json`, `text` |
| **Outputs** | `json` |
| **Required Config** | `url`, `method` |
| **Optional Config** | `headers`, `body`, `authType` |
| **Stub Status** | TODO: implement with SSRF protection |

---

### `graphql_request`

| | |
|-|-|
| **Purpose** | Execute a GraphQL query or mutation against an endpoint. |
| **Inputs** | `json` |
| **Outputs** | `json` |
| **Required Config** | `endpoint`, `query` |
| **Optional Config** | `variables`, `authHeader` |
| **Stub Status** | TODO: implement in runner |

---

## Category 8: Communication

### `email_send` (existing)
Send an email. Accepts `text`/`json`, rate-limited to 50/workflow-run.

### `slack_notify` (existing)
Post to a Slack webhook. Accepts `text`/`json`.

### `discord_notify` (existing)
Post to a Discord webhook. Accepts `text`/`json`.

### `telegram_notify`

| | |
|-|-|
| **Purpose** | Send a Telegram message via Bot API. |
| **Required Config** | `chatId`, `botTokenRef` (secret reference) |
| **Optional Config** | `parseMode` (`HTML` \| `Markdown`) |
| **Stub Status** | TODO: implement in runner |

---

### `push_notification`

| | |
|-|-|
| **Purpose** | Send a mobile push notification via FCM or APNs. |
| **Required Config** | `userId` or `deviceToken`, `title`, `body` |
| **Stub Status** | TODO: implement in runner |

---

### `sms_send`

| | |
|-|-|
| **Purpose** | Send an SMS via Twilio or similar provider. |
| **Required Config** | `to` (E.164), `message`, `providerRef` |
| **Stub Status** | TODO: implement in runner |

---

## Category 9: Integration

### `github_read` (existing)
Read GitHub issues/PRs. Accepts `json`, produces `json`.

### `rss_feed` (existing)
Fetch RSS feed items. Produces `json`.

### `notion_read` (existing)
Read a Notion page or database.

### `google_sheets_read` / `google_sheets_write` (existing)
Read or write Google Sheets ranges.

### `github_pr_review`

| | |
|-|-|
| **Purpose** | Post an AI-generated code review comment on a GitHub pull request. |
| **Inputs** | `json` — must contain `repo` (owner/repo) and `prNumber` |
| **Outputs** | `json` — `{ commentId, url }` |
| **Required Config** | `repo`, `prNumber`, `tokenRef` |
| **Stub Status** | TODO: implement in runner |

**Example:**
```json
{ "repo": "lenserfight/api", "prNumber": 42, "tokenRef": "github-token" }
```
**Expected Input:** `{ "diff": "...", "summary": "Add caching layer" }`
**Downstream:** `notion_write` (to log review)

---

### `github_issue_create`

| | |
|-|-|
| **Purpose** | Create a GitHub issue with title, body, labels, and assignees. |
| **Required Config** | `repo`, `title`, `tokenRef` |
| **Optional Config** | `body`, `labels`, `assignees` |
| **Stub Status** | TODO: implement in runner |

---

### `notion_write`

| | |
|-|-|
| **Purpose** | Create or update a Notion page or database row. |
| **Required Config** | `pageId` or `databaseId`, `tokenRef` |
| **Optional Config** | `properties` (JSON for database rows) |
| **Stub Status** | TODO: implement in runner |

---

### `calendar_create`

| | |
|-|-|
| **Purpose** | Create a Google Calendar event. |
| **Required Config** | `calendarId`, `title`, `start`, `end`, `tokenRef` |
| **Stub Status** | TODO: implement in runner |

---

### `linear_issue_create`

| | |
|-|-|
| **Purpose** | Create a Linear issue with project, team, and priority. |
| **Required Config** | `teamId`, `title`, `tokenRef` |
| **Optional Config** | `priority` (1–4), `projectId`, `assigneeId` |
| **Stub Status** | TODO: implement in runner |

---

### `jira_issue_create`

| | |
|-|-|
| **Purpose** | Create a Jira issue with project key, type, priority, and custom fields. |
| **Required Config** | `projectKey`, `issueType`, `summary`, `tokenRef` |
| **Optional Config** | `priority`, `customFields` (JSON) |
| **Stub Status** | TODO: implement in runner |

---

## Category 10: Media Generation

All media nodes require an AI provider with image/audio/video capabilities. Set `needsAiProvider: true`.

### `text_to_image`

| | |
|-|-|
| **Purpose** | Generate an image from a text prompt. |
| **Inputs** | `text` |
| **Outputs** | `image` |
| **Required Config** | `modelId`, `prompt` |
| **Optional Config** | `width`, `height`, `steps`, `negativePrompt` |

**Example:**
```json
{ "modelId": "fal:stable-diffusion-xl", "prompt": "Epic arena battle scene, digital art", "width": 1024, "height": 768 }
```
**Downstream:** `image_upscale` or `object_storage_upload`

---

### `image_to_image`

| | |
|-|-|
| **Purpose** | Transform an image using a prompt (style transfer, inpainting). |
| **Inputs** | `image` |
| **Outputs** | `image` |
| **Required Config** | `modelId`, `prompt`, `strength` (0–1) |

---

### `image_to_audio`

| | |
|-|-|
| **Purpose** | Generate an audio description or ambiance from an image. |
| **Inputs** | `image` |
| **Outputs** | `audio` |
| **Required Config** | `modelId` |

---

### `text_to_speech`

| | |
|-|-|
| **Purpose** | Convert text to spoken audio. |
| **Inputs** | `text` |
| **Outputs** | `audio` |
| **Required Config** | `modelId`, `voice` |
| **Optional Config** | `speed`, `format` (`mp3` \| `wav`) |

---

### `speech_to_text`

| | |
|-|-|
| **Purpose** | Transcribe audio to text (Whisper-compatible). |
| **Inputs** | `audio` |
| **Outputs** | `text` |
| **Required Config** | `modelId` |
| **Optional Config** | `language` (BCP-47) |

---

### `text_to_video`

| | |
|-|-|
| **Purpose** | Generate a short video clip from a text prompt. |
| **Inputs** | `text` |
| **Outputs** | `video` |
| **Required Config** | `modelId`, `prompt` |
| **Optional Config** | `durationSec` (max 30), `fps` |

---

### `image_upscale`

| | |
|-|-|
| **Purpose** | Upscale an image to a higher resolution. |
| **Inputs** | `image` |
| **Outputs** | `image` |
| **Required Config** | `modelId`, `scaleFactor` (2 or 4) |

---

### `media_convert`

| | |
|-|-|
| **Purpose** | Convert between media formats (mp4→gif, mp3→wav, etc.). |
| **Inputs** | `image`, `audio`, `video`, `file` |
| **Outputs** | `file` |
| **Required Config** | `targetFormat` |
| **Optional Config** | `quality`, `codec` |

---

## Category 11: Utility

### `logger`

| | |
|-|-|
| **Purpose** | Log upstream data to the workflow execution log. Pass-through node (transparent). |
| **Inputs** | `any` |
| **Outputs** | `json` — upstream data echoed |
| **Optional Config** | `label`, `level` (`info` \| `warn` \| `error`) |

---

### `debug_inspector`

| | |
|-|-|
| **Purpose** | Pause and expose the current node's input/output for inspection in the Studio. |
| **Inputs** | `any` |
| **Outputs** | `json` |
| **Optional Config** | `breakOnError` (boolean) |

---

### `secret_resolver`

| | |
|-|-|
| **Purpose** | Resolve a named secret from the workspace vault and inject it into `resolvedParams`. |
| **Inputs** | `any` |
| **Outputs** | `json` — `{ __secret_resolved: true, name }` |
| **Required Config** | `secretName` |

---

### `rate_limit`

| | |
|-|-|
| **Purpose** | Enforce a per-window rate limit on workflow execution. Stops with an error if exceeded. |
| **Required Config** | `maxCalls`, `windowSeconds` |

---

### `cache_read`

| | |
|-|-|
| **Purpose** | Read a cached result for the current node's inputs. Returns `null` on miss. |
| **Required Config** | `cacheKey` |
| **Optional Config** | `ttlSeconds` |

---

### `cache_write`

| | |
|-|-|
| **Purpose** | Write the upstream output to cache under a key. |
| **Required Config** | `cacheKey` |
| **Optional Config** | `ttlSeconds` |

---

### `retry`

| | |
|-|-|
| **Purpose** | Retry a failing downstream branch up to N times with exponential backoff. |
| **Required Config** | `maxAttempts` (1–5), `targetNodeId` |
| **Optional Config** | `backoffMs` |

---

### `noop`

| | |
|-|-|
| **Purpose** | Pass-through node that does nothing. Useful as a placeholder or merge point. |
| **Inputs** | `any` |
| **Outputs** | `json` — upstream data echoed |

---

## Common Workflow Patterns

### RAG Answer Pipeline
```
manual_trigger → rag_retrieval → prompt_template → lens → output_parser → email_send
```

### Scheduled Arena Digest
```
schedule_trigger → supabase_query → data_mapper → summarizer → email_send
```

### Automated Battle Judge
```
webhook_trigger → battle_execute → judge_battle → score_aggregator → leaderboard_update
```

### GitHub PR Review Bot
```
webhook_trigger → github_pr_review → notion_write → slack_notify
```

### Weekly Leaderboard Update
```
schedule_trigger → supabase_query → aggregate → sort → leaderboard_update → push_notification
```

### Image Generation Pipeline
```
form_input_trigger → text_to_image → image_upscale → object_storage_upload → email_send
```

---

## Adding a New Node

1. Add the type string to `WorkflowNodeType` in `libs/infra/execution/src/lib/execution.types.ts`
2. Add a `defineNode({...})` entry in the appropriate factory function in `libs/infra/execution/src/lib/catalog/workflow-node-catalog.ts`
3. Create a runner implementing `INodeRunner` in `libs/infra/execution/src/lib/runners/`
4. Register the runner in `libs/infra/execution/src/lib/runners/default-node-runners.ts`
5. Add a `RunnerConfigDescriptor` in `libs/features/workflows/src/lib/config/descriptors/`
6. Register the descriptor in `libs/features/workflows/src/lib/config/runner-config.bootstrap.ts`
7. Update `libs/features/workflows/src/lib/catalog/workflow-node-catalog.ts` if the UI catalog is used separately
8. Add a test to `catalog-runner-coverage.spec.ts` (it will automatically pass once the runner is registered)

See the full contributor guide at `docs/en/how-to/contributors/workflow-node-contribution-guide.md`.
