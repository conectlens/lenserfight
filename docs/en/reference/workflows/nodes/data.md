---
title: Data Nodes | Workflow Node Reference
description: Reference for all Data nodes in LenserFight Workflow Studio — JSON transformation, filtering, mapping, aggregation, and text splitting.
---

# Data Nodes

Data nodes transform, filter, reshape, and prepare payloads for downstream processing. Use them to clean API responses, prepare inputs for AI nodes, and normalize schemas between services.

| Node | Type | Output |
|------|------|--------|
| [JSON Transform](#json-transform) | `json_transform` | `json` |
| [Set Variables](#set-variables) | `set_variables` | `json` |
| [Extract Field](#extract-field) | `extract_field` | `text` |
| [Rename Field](#rename-field) | `rename_field` | `json` |
| [Filter Items](#filter-items) | `filter_items` | `array` |
| [Aggregate](#aggregate) | `aggregate` | `json` |
| [Sort](#sort) | `sort` | `array` |
| [Deduplicate](#deduplicate) | `deduplicate` | `array` |
| [Text Splitter](#text-splitter) | `text_splitter` | `document[]` |
| [Data Mapper](#data-mapper) | `data_mapper` | `json` |

---

## JSON Transform {#json-transform}

**Type:** `json_transform` · **Category:** Data

Transform JSON with a mapping expression. Extract, rename, reshape, or compute new fields from structured payloads.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `json` | `json` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `expression` | `string` | Mapping expression. Use `$` paths and template syntax. |

### Example

```json
{ "expression": "{ title: input.title, score: input.score }" }
```

**Expected input:** `{ "title": "Lens A", "score": 0.92, "metadata": {...} }`

**Expected output:** `{ "transformed": { "title": "Lens A", "score": 0.92 } }`

**Downstream:** → `data_mapper`

### Related Nodes

[Data Mapper](#data-mapper) · [Extract Field](#extract-field) · [Rename Field](#rename-field)

---

## Set Variables {#set-variables}

**Type:** `set_variables` · **Category:** Data

Set workflow variables for downstream nodes. Use to inject constants, computed values, or shared configuration into the execution context.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `variables` | `json` | Key/value pairs to set (e.g. `{ "digestWindow": "7d" }`). |

### Example

```json
{ "variables": { "digestWindow": "7d", "channel": "#arena-alerts" } }
```

**Downstream:** → `prompt_template`

### Related Nodes

[JSON Transform](#json-transform) · [Data Mapper](#data-mapper)

---

## Extract Field {#extract-field}

**Type:** `extract_field` · **Category:** Data

Extract one field from a JSON payload. Returns a `text` output for use in nodes that accept plain string input.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | JSON path to the field (e.g. `$.pull_request.body`). |

### Example

```json
{ "path": "$.pull_request.body" }
```

**Expected output:** `{ "value": "This PR adds workflow runners." }`

**Downstream:** → `summarizer`

---

## Rename Field {#rename-field}

**Type:** `rename_field` · **Category:** Data

Rename one or more fields while preserving the rest of the payload.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `renames` | `json` | Map of `{ oldKey: newKey }` pairs. |

### Example

```json
{ "renames": { "body": "digestBody", "title": "digestTitle" } }
```

**Expected output:** `{ "digestBody": "...", "digestTitle": "Weekly digest" }`

**Downstream:** → `email_send`

---

## Filter Items {#filter-items}

**Type:** `filter_items` · **Category:** Data

Filter array items by condition. Removes items that do not match.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `items` | `array` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `condition` | `string` | Boolean expression (e.g. `$.score >= 0.75`). |

### Example

```json
{ "condition": "$.score >= 0.75" }
```

**Expected output:** `{ "items": [{ "id": "doc_1", "score": 0.91 }] }`

**Downstream:** → `rag_retrieval`

### Related Nodes

[Deduplicate](#deduplicate) · [Sort](#sort) · [Aggregate](#aggregate)

---

## Aggregate {#aggregate}

**Type:** `aggregate` · **Category:** Data

Aggregate numeric or grouped values from an array. Supports `avg`, `sum`, `min`, `max`, `count` operations with optional `groupBy`.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `items` | `array` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `groupBy` | `string` | Field path to group by (e.g. `$.contender`). |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `metrics` | `json` | Array of `{ field, op, as }` metric definitions. |

### Example

```json
{
  "groupBy": "$.contender",
  "metrics": [{ "field": "$.score", "op": "avg", "as": "averageScore" }]
}
```

**Expected output:** `{ "groups": [{ "contender": "A", "averageScore": 0.84 }] }`

**Downstream:** → `score_aggregator`

---

## Sort {#sort}

**Type:** `sort` · **Category:** Data

Sort items by a configured field and direction.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `items` | `array` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `sortBy` | `string` | Field path to sort on (e.g. `$.score`). |

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `direction` | `string` | `asc` | `asc` · `desc` |

### Example

```json
{ "sortBy": "$.score", "direction": "desc" }
```

**Expected output:** `{ "items": [{ "id": "a", "score": 0.98 }] }`

**Downstream:** → `leaderboard_update`

---

## Deduplicate {#deduplicate}

**Type:** `deduplicate` · **Category:** Data

Remove duplicate items by key. Keeps the first occurrence of each unique key value.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `items` | `array` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `keyPath` | `string` | Path to the deduplication key (e.g. `$.url`). |

### Example

```json
{ "keyPath": "$.url" }
```

**Expected output:** `{ "items": [{ "url": "https://example.com/post", "title": "Arena news" }] }`

**Downstream:** → `summarizer`

---

## Text Splitter {#text-splitter}

**Type:** `text_splitter` · **Category:** Data

Split long text or documents into chunks for downstream embedding or processing.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `text` | `text` | Yes |

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `documents` | `document[]` | Chunked documents with metadata. |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `chunkSize` | `number` | Chunk size in characters. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `chunkOverlap` | `number` | `120` |

### Example

```json
{ "chunkSize": 1000, "chunkOverlap": 120 }
```

**Expected output:** `{ "documents": [{ "pageContent": "Battle report chunk...", "metadata": { "chunk": 1 } }] }`

**Downstream:** → `embedding`

### Valid Connections

→ `embedding` (primary use case)

→ `rag_retrieval` (if chunks are pre-indexed)

### Related Nodes

[Embedding](./ai-primitives#embedding) · [RAG Retriever](./ai-primitives#rag-retrieval)

---

## Data Mapper {#data-mapper}

**Type:** `data_mapper` · **Category:** Data

Map fields from one schema into another using a declarative mapping object. Use to bridge incompatible schemas between nodes (e.g. API response → email template fields).

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `mapping` | `json` | Field mapping: `{ targetField: "$.sourcePath" }`. |

### Example

```json
{
  "mapping": {
    "to": "$.owner.email",
    "subject": "PR Review: {{title}}",
    "body": "$.summary"
  }
}
```

**Expected output:** `{ "to": "owner@example.com", "subject": "PR Review: Add runners", "body": "Review summary..." }`

**Downstream:** → `email_send`

### Related Nodes

[JSON Transform](#json-transform) · [Rename Field](#rename-field) · [Set Variables](#set-variables)

---

**See also:** [Node Catalog Index](./) · [Logic Nodes](./logic) · [AI Primitive Nodes](./ai-primitives) · [Workflow Studio](/en/how-to/agents/workspace/workflows)
