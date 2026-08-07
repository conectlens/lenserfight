---
title: Workflow Node Reference
description: Complete reference for all LenserFight workflow node types, organized by category.
---

# Workflow Node Reference

Every workflow node in LenserFight Workflow Studio is documented here, organized by category. Each node page covers purpose, inputs, outputs, required and optional configuration, example configurations, valid and invalid connections, execution notes, and troubleshooting.

## Categories

| Category | Count | Description |
|----------|-------|-------------|
| [Lens](./lens.md) | 1 | Execute LenserFight lens prompts with model and parameter overrides |
| [Triggers](./trigger.md) | 5 | Start a workflow — manual, scheduled, webhook, event, or form |
| [Logic](./logic.md) | 11 | Control flow — branching, looping, merging, error handling |
| [Data](./data.md) | 10 | Transform, filter, map, and reshape JSON and array payloads |
| [AI Primitives](./ai-primitives.md) | 17 | Prompting, embedding, RAG, evaluation, memory, and AI chains |
| [Battle / Arena](./battle.md) | 7 | Battle lifecycle — create, execute, judge, vote, score, rank |
| [Storage & I/O](./storage.md) | 11 | Supabase, KV, file, HTTP, webhook, and GraphQL access |
| [Communication](./communication.md) | 6 | Email, Slack, Discord, Telegram, push, and SMS delivery |
| [Integrations](./integration.md) | 11 | GitHub, Notion, RSS, Google Sheets, Linear, Jira, and Calendar |
| [Media Generation](./media.md) | 8 | Image, audio, video, and speech generation and conversion |
| [Utility](./utility.md) | 8 | Logging, debugging, caching, rate limiting, and secrets |

## Quick Index

### Triggers
[Manual Trigger](./trigger.md#manual-trigger) · [Schedule Trigger](./trigger.md#schedule-trigger) · [Webhook Trigger](./trigger.md#webhook-trigger) · [Event Trigger](./trigger.md#event-trigger) · [Form / Input Trigger](./trigger.md#form-input-trigger)

### Logic
[Code](./logic.md#code) · [Switch](./logic.md#switch) · [If / Condition](./logic.md#if-condition) · [Loop / Map](./logic.md#loop-map) · [Wait / Delay](./logic.md#wait-delay) · [Error Catch](./logic.md#error-catch) · [Try / Catch](./logic.md#try-catch) · [Merge](./logic.md#merge) · [Split In Batches](./logic.md#split-in-batches) · [Sub-Workflow](./logic.md#sub-workflow) · [Stop / Return](./logic.md#stop-return)

### Data
[JSON Transform](./data.md#json-transform) · [Set Variables](./data.md#set-variables) · [Extract Field](./data.md#extract-field) · [Rename Field](./data.md#rename-field) · [Filter Items](./data.md#filter-items) · [Aggregate](./data.md#aggregate) · [Sort](./data.md#sort) · [Deduplicate](./data.md#deduplicate) · [Text Splitter](./data.md#text-splitter) · [Data Mapper](./data.md#data-mapper)

### AI Primitives
[Prompt Template](./ai-primitives.md#prompt-template) · [Lens Execute](./ai-primitives.md#lens-execute) · [Agent Execute](./ai-primitives.md#agent-execute) · [Output Parser](./ai-primitives.md#output-parser) · [Embedding](./ai-primitives.md#embedding) · [RAG Retriever](./ai-primitives.md#rag-retrieval) · [Vector Search](./ai-primitives.md#vector-search) · [Judge / Eval](./ai-primitives.md#judge-evaluator) · [Memory Read](./ai-primitives.md#memory-read) · [Memory Write](./ai-primitives.md#memory-write) · [Chain](./ai-primitives.md#chain) · [Summarizer](./ai-primitives.md#summarizer) · [Classifier](./ai-primitives.md#classifier) · [Translator](./ai-primitives.md#translator) · [Image Analyze](./ai-primitives.md#image-analyze) · [Audio Transcribe](./ai-primitives.md#audio-transcribe) · [Video Analyze](./ai-primitives.md#video-analyze)

### Battle / Arena
[Battle Create](./battle.md#battle-create) · [Battle Execute](./battle.md#battle-execute) · [Contender Run](./battle.md#contender-run) · [Judge Battle](./battle.md#judge-battle) · [Vote Collector](./battle.md#vote-collector) · [Score Aggregator](./battle.md#score-aggregator) · [Leaderboard Update](./battle.md#leaderboard-update)

### Storage & I/O
[Supabase Query](./storage.md#supabase-query) · [SQL Query](./storage.md#sql-query) · [KV Read](./storage.md#kv-store-read) · [KV Write](./storage.md#kv-store-write) · [File Reader](./storage.md#file-reader) · [File Writer](./storage.md#file-writer) · [Object Storage Upload](./storage.md#object-storage-upload) · [Object Storage Download](./storage.md#object-storage-download) · [Webhook Send](./storage.md#webhook-sender) · [HTTP Request](./storage.md#http-request) · [GraphQL Request](./storage.md#graphql-request)

### Communication
[Email Send](./communication.md#email-send) · [Slack Notify](./communication.md#slack-notify) · [Discord Notify](./communication.md#discord-notify) · [Telegram Notify](./communication.md#telegram-notify) · [Push Notification](./communication.md#push-notification) · [SMS Send](./communication.md#sms-send)

### Integrations
[GitHub Read](./integration.md#github-read) · [GitHub PR Review](./integration.md#github-pr-review) · [GitHub Issue Create](./integration.md#github-issue-create) · [RSS Feed](./integration.md#rss-feed) · [Notion Read](./integration.md#notion-read) · [Notion Write](./integration.md#notion-write) · [Sheets Read](./integration.md#google-sheets-read) · [Sheets Write](./integration.md#google-sheets-write) · [Calendar Create](./integration.md#calendar-create) · [Linear Issue Create](./integration.md#linear-issue-create) · [Jira Issue Create](./integration.md#jira-issue-create)

### Media Generation
[Text to Image](./media.md#text-to-image) · [Image to Image](./media.md#image-to-image) · [Image to Audio](./media.md#image-to-audio) · [Text to Speech](./media.md#text-to-speech) · [Speech to Text](./media.md#speech-to-text) · [Text to Video](./media.md#text-to-video) · [Image Upscale](./media.md#image-upscale) · [Media Convert](./media.md#media-convert)

### Utility
[Logger](./utility.md#logger) · [Debug Inspector](./utility.md#debug-inspector) · [Secret Resolver](./utility.md#secret-resolver) · [Rate Limit](./utility.md#rate-limit) · [Cache Read](./utility.md#cache-read) · [Cache Write](./utility.md#cache-write) · [Retry](./utility.md#retry) · [No-Op](./utility.md#noop)

---

**See also:** [Workflow Studio How-To](/en/how-to/agents/workspace/workflows) · [Workflow Concepts](/en/explanation/workflows/workflow-concepts) · [Execution Engine](/en/reference/workflows/execution-engine) · [Workflow Templates](/en/tutorials/walkthroughs/create-a-workflow)
