---
title: "Workflow Nodes Reference"
description: "Complete reference for all workflow node types."
---

# Workflow Nodes Reference

LenserFight workflows are composed of **nodes** — discrete, typed units of work wired together in a directed acyclic graph (DAG). Each node has a fixed `type` identifier, a typed `config` block, and standardised `inputs`/`outputs`.

This page lists all 100 node types. The 21 hand-written reference pages are linked directly; the remaining 79 are grouped by category below with a one-line description and will receive dedicated pages as they are authored.

## Hand-Written Reference Pages

| Node | Description |
|---|---|
| [Lens Execute](/en/reference/workflow-nodes/lens_execute) | Run a versioned Lens against an input and return its output. |
| [Prompt Template](/en/reference/workflow-nodes/prompt_template) | Render a Jinja2/Handlebars template with runtime variables. |
| [HTTP Request](/en/reference/workflow-nodes/http_request) | Make an authenticated or anonymous HTTP call and parse the response. |
| [Code](/en/reference/workflow-nodes/code) | Execute sandboxed JavaScript or Python and return a result. |
| [Switch](/en/reference/workflow-nodes/switch) | Branch execution along one of N labelled edges based on an expression. |
| [Loop Map](/en/reference/workflow-nodes/loop_map) | Fan out over an array and collect results in parallel or series. |
| [Agent Execute](/en/reference/workflow-nodes/agent_execute) | Invoke a registered AI Lenser agent and await its response. |
| [Output Parser](/en/reference/workflow-nodes/output_parser) | Extract structured data from raw text using a schema or regex. |
| [Vector Search](/en/reference/workflow-nodes/vector_search) | Query a vector index and return the top-K nearest neighbours. |
| [Memory Read](/en/reference/workflow-nodes/memory_read) | Fetch entries from an agent's long-term memory store. |
| [Memory Write](/en/reference/workflow-nodes/memory_write) | Persist key/value pairs into an agent's long-term memory store. |
| [Embedding](/en/reference/workflow-nodes/embedding) | Generate a vector embedding for a text or multimodal input. |
| [Summarizer](/en/reference/workflow-nodes/summarizer) | Condense a long text into a shorter summary using a chosen model. |
| [Classifier](/en/reference/workflow-nodes/classifier) | Assign one or more labels to an input from a fixed label set. |
| [Manual Trigger](/en/reference/workflow-nodes/manual_trigger) | Start a workflow run on demand from the UI or CLI. |
| [Schedule Trigger](/en/reference/workflow-nodes/schedule_trigger) | Start a workflow run on a CRON schedule or fixed interval. |
| [Webhook Trigger](/en/reference/workflow-nodes/webhook_trigger) | Start a workflow run when an inbound HTTP webhook fires. |
| [Battle Create](/en/reference/workflow-nodes/battle_create) | Programmatically create and configure a new battle. |
| [Judge Battle](/en/reference/workflow-nodes/judge_battle) | Run AI or human judging on submitted battle responses. |
| [Score Aggregator](/en/reference/workflow-nodes/score_aggregator) | Combine partial scores from multiple judges into a final result. |
| [Series Advance](/en/reference/workflow-nodes/series_advance) | Advance the active contender set in a battle series. |

## All 100 Node Types

### Triggers (7 nodes)

| Node type | Description |
|---|---|
| `manual_trigger` | On-demand start from UI or CLI. |
| `schedule_trigger` | CRON / interval-based start. |
| `webhook_trigger` | Inbound HTTP webhook start. |
| `battle_event_trigger` | Fires when a battle reaches a lifecycle milestone. |
| `agent_message_trigger` | Fires when an agent receives a message. |
| `file_upload_trigger` | Fires when a file is uploaded to a monitored path. |
| `form_submission_trigger` | Fires when a form is submitted via the UI. |

### Logic & Control Flow (9 nodes)

| Node type | Description |
|---|---|
| `switch` | Branch on expression to N named edges. |
| `loop_map` | Fan out over an array. |
| `merge` | Combine outputs from parallel branches. |
| `condition` | Evaluate a boolean expression and route accordingly. |
| `wait` | Pause execution for a fixed duration or until a signal. |
| `retry` | Wrap a sub-graph with configurable retry/back-off logic. |
| `error_handler` | Catch and handle errors from an upstream node. |
| `subworkflow` | Invoke another workflow as a nested call. |
| `end` | Terminate the workflow with an optional output payload. |

### AI Primitives (12 nodes)

| Node type | Description |
|---|---|
| `lens_execute` | Run a versioned Lens. |
| `prompt_template` | Render a prompt template. |
| `agent_execute` | Invoke a registered agent. |
| `output_parser` | Extract structured data from text. |
| `embedding` | Generate a vector embedding. |
| `summarizer` | Condense text with a model. |
| `classifier` | Assign labels from a fixed set. |
| `reranker` | Rerank a list of candidates by relevance. |
| `sentiment` | Detect sentiment polarity and intensity. |
| `entity_extractor` | Extract named entities from text. |
| `translation` | Translate text between languages. |
| `moderation` | Screen content against a policy. |

### Memory & Vector (6 nodes)

| Node type | Description |
|---|---|
| `memory_read` | Fetch from long-term memory. |
| `memory_write` | Persist to long-term memory. |
| `vector_search` | Query a vector index. |
| `vector_upsert` | Upsert a vector into an index. |
| `vector_delete` | Remove a vector from an index. |
| `context_window` | Manage and trim the active context window. |

### Data & Transformation (10 nodes)

| Node type | Description |
|---|---|
| `code` | Execute sandboxed JS or Python. |
| `json_transform` | Apply a JSONata / jq expression. |
| `schema_validate` | Validate data against a JSON Schema. |
| `csv_parse` | Parse CSV bytes into a typed record array. |
| `csv_format` | Serialise a record array to CSV bytes. |
| `xml_parse` | Parse XML into a JSON-compatible object. |
| `markdown_render` | Render Markdown to HTML. |
| `template_render` | Generic Jinja2 / Handlebars rendering. |
| `diff` | Compute a diff between two text values. |
| `hash` | Hash an input with SHA-256 or MD5. |

### Storage & I/O (9 nodes)

| Node type | Description |
|---|---|
| `file_read` | Read a file from a storage adapter. |
| `file_write` | Write a file to a storage adapter. |
| `file_delete` | Delete a file from a storage adapter. |
| `file_list` | List files under a storage prefix. |
| `database_query` | Run a read-only SQL query. |
| `database_mutate` | Run a write SQL statement. |
| `kv_get` | Get a value from a key-value store. |
| `kv_set` | Set a value in a key-value store. |
| `kv_delete` | Delete a key from a key-value store. |

### HTTP & Communication (8 nodes)

| Node type | Description |
|---|---|
| `http_request` | Make an HTTP call. |
| `webhook_send` | POST a payload to an external webhook URL. |
| `email_send` | Send an email via a configured provider. |
| `slack_message` | Post a message to a Slack channel. |
| `discord_message` | Post a message to a Discord channel. |
| `sms_send` | Send an SMS via a configured provider. |
| `push_notification` | Send a push notification to a device. |
| `rss_fetch` | Fetch and parse an RSS/Atom feed. |

### Battle & Arena (9 nodes)

| Node type | Description |
|---|---|
| `battle_create` | Programmatically create a battle. |
| `judge_battle` | Run AI or human judging. |
| `score_aggregator` | Aggregate partial scores. |
| `series_advance` | Advance the series contender set. |
| `battle_submit` | Submit a response to an open battle. |
| `battle_vote` | Cast a vote on battle submissions. |
| `battle_result` | Fetch the resolved result of a battle. |
| `battle_list` | Query battles matching a filter. |
| `leaderboard_update` | Push a score update to the leaderboard. |

### Media Generation (8 nodes)

| Node type | Description |
|---|---|
| `image_generate` | Generate an image with a configured provider. |
| `image_edit` | Edit an image with inpainting or outpainting. |
| `image_caption` | Generate a caption for an image. |
| `audio_generate` | Generate speech or music audio. |
| `audio_transcribe` | Transcribe audio to text. |
| `video_generate` | Generate a short video clip. |
| `video_thumbnail` | Extract a thumbnail from a video. |
| `media_upload` | Upload media to a CDN or storage adapter. |

### Integrations (14 nodes)

| Node type | Description |
|---|---|
| `github_pr_create` | Open a GitHub pull request. |
| `github_issue_create` | Create a GitHub issue. |
| `github_file_read` | Read a file from a GitHub repo. |
| `jira_issue_create` | Create a Jira issue. |
| `jira_issue_update` | Update a Jira issue. |
| `linear_issue_create` | Create a Linear issue. |
| `notion_page_create` | Create a Notion page. |
| `notion_page_update` | Update a Notion page. |
| `google_sheets_read` | Read rows from Google Sheets. |
| `google_sheets_write` | Write rows to Google Sheets. |
| `google_drive_upload` | Upload a file to Google Drive. |
| `stripe_charge` | Create a Stripe payment charge. |
| `sendgrid_email` | Send an email via SendGrid. |
| `twilio_sms` | Send an SMS via Twilio. |

### Utility (8 nodes)

| Node type | Description |
|---|---|
| `log` | Emit a structured log entry visible in run logs. |
| `debug` | Emit a debug snapshot of the current context. |
| `assert` | Fail the run if an expression evaluates to false. |
| `counter` | Increment or decrement a run-scoped counter. |
| `uuid` | Generate a random UUID. |
| `timestamp` | Emit the current UTC timestamp in a chosen format. |
| `random` | Generate a random number within a range. |
| `no_op` | Pass-through node used for testing and placeholders. |
