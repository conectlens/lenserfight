---
title: AI Primitive Nodes | Workflow Node Reference
description: Reference for all AI Primitive nodes in LenserFight Workflow Studio — prompting, embedding, RAG, evaluation, memory, and AI chains.
---

# AI Primitive Nodes

AI Primitive nodes are the building blocks of intelligent pipelines. They handle prompt rendering, lens execution, agent delegation, output parsing, vector embedding, RAG retrieval, evaluation, memory, and multi-step AI chains.

| Node | Type | Output |
|------|------|--------|
| [Prompt Template](#prompt-template) | `prompt_template` | `text` |
| [Lens Execute](#lens-execute) | `lens_execute` | `lens_result` |
| [Agent Execute](#agent-execute) | `agent_execute` | `agent_result` |
| [Output Parser](#output-parser) | `output_parser` | `json` |
| [Embedding](#embedding) | `embedding` | `embedding` |
| [RAG Retriever](#rag-retrieval) | `rag_retrieval` | `document[]` |
| [Vector Search](#vector-search) | `vector_search` | `document[]` |
| [Judge / Eval](#judge-evaluator) | `judge_evaluator` | `json` |
| [Memory Read](#memory-read) | `memory_read` | `document[]` |
| [Memory Write](#memory-write) | `memory_write` | `json` |
| [Chain](#chain) | `chain` | `json` |
| [Summarizer](#summarizer) | `summarizer` | `text` |
| [Classifier](#classifier) | `classifier` | `json` |
| [Translator](#translator) | `translator` | `text` |
| [Image Analyze](#image-analyze) | `image_analyze` | `json` |
| [Audio Transcribe](#audio-transcribe) | `audio_transcribe` | `text` |
| [Video Analyze](#video-analyze) | `video_analyze` | `json` |

---

## Prompt Template {#prompt-template}

**Type:** `prompt_template` · **Category:** AI Primitive

Render a prompt from variables and upstream data. Use before `lens_execute` or `lens` nodes to construct the input text.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `template` | `template` | Prompt template using <code v-pre>{{variable}}</code> syntax. |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `variables` | `json` | Explicit variable mappings: `{ varName: "$.sourcePath" }`. |

### Example

```json
{
  "template": "Summarize these arena results for {{audience}}: {{results}}",
  "variables": { "audience": "founders", "results": "$.results" }
}
```

**Expected output:** `{ "prompt": "Summarize these arena results for founders: ..." }`

**Downstream:** → `lens_execute` with `{ "prompt": "$.prompt" }`

### Related Nodes

[Lens Execute](#lens-execute) · [Lens Node](./lens) · [Output Parser](#output-parser)

---

## Lens Execute {#lens-execute}

**Type:** `lens_execute` · **Category:** AI Primitive

Execute a selected LenserFight lens as a utility node (unlike the top-level Lens node, this is a catalog-driven step with an explicit `lensId`).

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `lensId` | `string` | Lens id to execute. |
| `model_id` | `string` | Model key (e.g. `openai:gpt-4.1-mini`). |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `param_overrides` | `json` | Lens parameter overrides. |

### Example

```json
{
  "lensId": "lens_weekly_digest",
  "model_id": "openai:gpt-4.1-mini",
  "param_overrides": { "tone": "crisp" }
}
```

**Expected output:** `{ "lensResult": { "text": "Weekly digest...", "modelId": "openai:gpt-4.1-mini" } }`

**Downstream:** → `email_send` with `{ "body": "$.lensResult.text" }`

### Related Nodes

[Lens Node](./lens) · [Prompt Template](#prompt-template) · [Judge / Eval](#judge-evaluator)

---

## Agent Execute {#agent-execute}

**Type:** `agent_execute` · **Category:** AI Primitive

Delegate work to a configured LenserFight agent. The agent runs autonomously and returns a structured result.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | `string` | Agent id to invoke. |
| `task` | `template` | Task prompt with <code v-pre>{{variable}}</code> interpolation. |

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `delegationPolicy` | `select` | `auto` | `auto` · `approval_required` · `forbidden` |

### Example

```json
{
  "agentId": "agent_pr_reviewer",
  "task": "Review PR {{prNumber}} for security and tests.",
  "delegationPolicy": "approval_required"
}
```

**Expected output:** `{ "agentResult": { "status": "completed", "summary": "Found 2 issues", "artifacts": [] } }`

**Downstream:** → `github_pr_review` with `{ "reviewBody": "$.agentResult.summary" }`

---

## Output Parser {#output-parser}

**Type:** `output_parser` · **Category:** AI Primitive

Parse model text into strict JSON fields. Use after a Lens or Lens Execute node when the model returns JSON-embedded in text.

### Optional Config

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `schema` | `json` | — | Expected output schema for type coercion. |
| `strict` | `boolean` | `true` | Fail when parsing is incomplete. |

### Example

```json
{
  "schema": { "score": "number", "reasoning": "string", "winner": "string" },
  "strict": true
}
```

**Expected output:** `{ "score": 0.86, "reasoning": "Candidate A cites more evidence.", "winner": "candidate_a" }`

**Downstream:** → `judge_evaluator`

### Valid Connections

→ `judge_evaluator`, `score_aggregator`, `leaderboard_update`

### Invalid Connections

✗ Cannot receive structured `json` input directly — it expects model-generated `text`.

### Related Nodes

[Lens Execute](#lens-execute) · [Judge / Eval](#judge-evaluator)

---

## Embedding {#embedding}

**Type:** `embedding` · **Category:** AI Primitive

Convert text or documents into embedding vectors with metadata. Use for building vector indexes, semantic similarity search, and RAG pipelines.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `content` | `text` | No |
| `documents` | `document[]` | No |

At least one of `content` or `documents` is required.

### Outputs

| Name | Type | Shape |
|------|------|-------|
| `embedding` | `embedding` | `{ vector: number[], dimensions: number, metadata: json }` |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `provider` | `select` | `openai` · `google` · `mistral` |
| `model` | `string` | Embedding model (e.g. `text-embedding-3-small`). |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `inputPath` | `string` | `$.text` |
| `chunkSize` | `number` | `1000` |
| `dimensions` | `number` | `1536` |
| `metadataFields` | `string[]` | — |

### Example

```json
{
  "provider": "openai",
  "model": "text-embedding-3-small",
  "inputPath": "$.documents[*].pageContent",
  "chunkSize": 1000,
  "dimensions": 1536,
  "metadataFields": ["battleId", "contenderId"],
  "retry": { "attempts": 3, "backoffMs": 1500 }
}
```

**Scenario:** Embed battle reports for later RAG retrieval.

**Downstream:** → `vector_search` with `{ "vector": "$.embedding.vector" }`

### Valid Connections

→ `vector_search` (direct vector lookup)

→ `rag_retrieval` (query embedding for retrieval)

### Related Nodes

[Text Splitter](./data#text-splitter) · [RAG Retriever](#rag-retrieval) · [Vector Search](#vector-search)

---

## RAG Retriever {#rag-retrieval}

**Type:** `rag_retrieval` · **Category:** AI Primitive

Retrieve scored documents from a vector source for a query. Use in question-answering, search, and context-augmented generation pipelines.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `query` | `text` | Yes |
| `source` | `embedding` | No |

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `documents` | `document[]` | Retrieved documents with scores. |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `vectorStore` | `string` | Vector source (e.g. `supabase:workflow_documents`). |
| `queryPath` | `string` | Query mapping (e.g. `$.rootInputs.query`). |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `topK` | `number` | `5` |
| `similarityThreshold` | `number` | `0.72` |
| `filters` | `json` | — |
| `rerank` | `boolean` | `true` |

### Example

```json
{
  "vectorStore": "supabase:workflow_documents",
  "queryPath": "$.rootInputs.query",
  "topK": 6,
  "similarityThreshold": 0.74,
  "filters": { "workspaceId": "{{workspace.id}}" },
  "rerank": true
}
```

**Scenario:** Retrieve knowledge base passages before answering a user question.

**Downstream:** → `prompt_template` with `{ "context": "$.documents[*].pageContent" }`

### Valid Connections

→ `prompt_template`, `summarizer`, `judge_evaluator`

### Related Nodes

[Embedding](#embedding) · [Vector Search](#vector-search) · [Prompt Template](#prompt-template)

---

## Vector Search {#vector-search}

**Type:** `vector_search` · **Category:** AI Primitive

Search vectors directly using an embedding input.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `embedding` | `embedding` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `vectorStore` | `string` | Vector index name. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `topK` | `number` | `5` |

### Example

```json
{
  "vectorStore": "supabase:workflow_documents",
  "topK": 5,
  "filters": { "battleId": "$.metadata.battleId" }
}
```

**Downstream:** → `summarizer`

### Related Nodes

[Embedding](#embedding) · [RAG Retriever](#rag-retrieval)

---

## Judge / Eval {#judge-evaluator}

**Type:** `judge_evaluator` · **Category:** AI Primitive

Evaluate candidates against a rubric and emit structured scoring. The core node for AI-powered evaluation in battle pipelines.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `candidates` | `json` | Yes |
| `rubric` | `text` | No |

### Outputs

| Name | Type | Shape |
|------|------|-------|
| `evaluation` | `json` | `{ score: number, reasoning: text, winner: text, confidence: number }` |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `rubric` | `template` | Evaluation rubric prompt. |
| `scoringScale` | `string` | Scale descriptor (e.g. `0-100`). |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `judgeModel` | `string` | — |
| `tieBreakRule` | `string` | — |
| `confidenceThreshold` | `number` | `0.7` |

### Example

```json
{
  "rubric": "Score correctness, source coverage, and actionability. Return JSON.",
  "scoringScale": "0-100",
  "candidateMappings": { "a": "$.answerA", "b": "$.answerB" },
  "judgeModel": "anthropic:claude-3-7-sonnet",
  "tieBreakRule": "prefer_higher_source_coverage",
  "confidenceThreshold": 0.76
}
```

**Expected output:** `{ "score": 91, "reasoning": "Answer A is more complete.", "winner": "answerA", "confidence": 0.84 }`

**Downstream:** → `score_aggregator` with `{ "score": "$.score", "winner": "$.winner" }`

### Valid Connections

→ `score_aggregator`, `leaderboard_update`, `slack_notify`

### Related Nodes

[Battle Execute](./battle#battle-execute) · [Output Parser](#output-parser) · [Score Aggregator](./battle#score-aggregator)

---

## Memory Read {#memory-read}

**Type:** `memory_read` · **Category:** AI Primitive

Read conversation or workflow memory entries from a named namespace.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `memoryKey` | `string` | Memory namespace (e.g. `workspace:arena-digests`). |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `limit` | `number` | `10` |

### Example

```json
{ "memoryKey": "workspace:arena-digests", "limit": 8, "query": "$.query" }
```

**Expected output:** `{ "documents": [{ "pageContent": "Last digest favored concise answers." }] }`

**Downstream:** → `prompt_template` with `{ "memory": "$.documents" }`

### Related Nodes

[Memory Write](#memory-write) · [RAG Retriever](#rag-retrieval)

---

## Memory Write {#memory-write}

**Type:** `memory_write` · **Category:** AI Primitive

Write durable workflow memory to a named namespace.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `memoryKey` | `string` | Memory namespace. |
| `contentPath` | `string` | Content mapping (e.g. `$.summary`). |

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `policy` | `select` | `on_success` | `on_success` · `checkpoint` |

### Example

```json
{
  "memoryKey": "workspace:arena-digests",
  "contentPath": "$.summary",
  "policy": "checkpoint",
  "metadata": { "source": "weekly_digest" }
}
```

**Downstream:** → `logger`

### Related Nodes

[Memory Read](#memory-read)

---

## Chain {#chain}

**Type:** `chain` · **Category:** AI Primitive

Run a configured AI chain of prompt, model, and parser steps sequentially.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `steps` | `json` | Chain step definitions. Each step: `{ type, ...stepConfig }`. |

### Example

```json
{
  "steps": [
    { "type": "prompt_template", "template": "Summarize {{input}}" },
    { "type": "lens_execute", "model_id": "openai:gpt-4.1-mini" },
    { "type": "output_parser", "schema": { "summary": "string" } }
  ]
}
```

**Expected output:** `{ "summary": "PR changes add catalog-backed workflow nodes." }`

**Downstream:** → `slack_notify` with `{ "text": "$.summary" }`

---

## Summarizer {#summarizer}

**Type:** `summarizer` · **Category:** AI Primitive

Summarize text or documents using a selected model.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Model key. |

### Example

```json
{ "provider": "openai", "model": "gpt-4.1-mini", "inputPath": "$" }
```

**Downstream:** → `email_send`

### Related Nodes

[Prompt Template](#prompt-template) · [Lens Execute](#lens-execute) · [Text Splitter](./data#text-splitter)

---

## Classifier {#classifier}

**Type:** `classifier` · **Category:** AI Primitive

Classify text into configured labels with confidence scores.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Model key. |

### Example

```json
{ "provider": "openai", "model": "gpt-4.1-mini", "inputPath": "$" }
```

**Expected output:** `{ "label": "high_risk", "confidence": 0.87 }`

**Downstream:** → `switch`

---

## Translator {#translator}

**Type:** `translator` · **Category:** AI Primitive

Translate text into a target language.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Model key. |

### Example

```json
{ "provider": "openai", "model": "gpt-4.1-mini", "instructions": "Create translation for localized founder note." }
```

**Downstream:** → `notion_write`

---

## Image Analyze {#image-analyze}

**Type:** `image_analyze` · **Category:** AI Primitive

Analyze an image and return structured observations (labels, objects, text, sentiment).

### Inputs

| Name | Type | Required |
|------|------|----------|
| `image` | `image` | Yes |

### Example

```json
{ "provider": "openai", "model": "gpt-4.1-mini" }
```

**Downstream:** → `judge_evaluator` for media moderation review.

---

## Audio Transcribe {#audio-transcribe}

**Type:** `audio_transcribe` · **Category:** AI Primitive

Transcribe audio into text with timestamps.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `audio` | `audio` | Yes |

### Example

```json
{ "provider": "openai", "model": "gpt-4o-transcribe" }
```

**Downstream:** → `summarizer` for meeting summary pipeline.

---

## Video Analyze {#video-analyze}

**Type:** `video_analyze` · **Category:** AI Primitive

Analyze video frames and transcript into structured notes.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `video` | `video` | Yes |

### Example

```json
{ "provider": "openai", "model": "gpt-4.1-mini" }
```

**Downstream:** → `summarizer` for battle replay review.

---

**See also:** [Node Catalog Index](./) · [Battle Nodes](./battle) · [Data Nodes](./data) · [Embedding and RAG concepts](/en/explanation/workflows/workflow-concepts) · [Workflow Studio](/en/how-to/agents/workspace/workflows)
