---
title: Workflow Node Reference
description: Complete reference for all LenserFight workflow node types, organized by category.
---

# Workflow Node Reference

Every workflow node in LenserFight Workflow Studio is documented here, organized by category. Each node page covers purpose, inputs, outputs, required and optional configuration, example configurations, valid and invalid connections, execution notes, and troubleshooting.

## Categories

| Category | Count | Description |
|----------|-------|-------------|
| [Lens](./lens) | 1 | Execute LenserFight lens prompts with model and parameter overrides |
| [Triggers](./trigger) | 5 | Start a workflow — manual, scheduled, webhook, event, or form |
| [Logic](./logic) | 11 | Control flow — branching, looping, merging, error handling |
| [Data](./data) | 10 | Transform, filter, map, and reshape JSON and array payloads |
| [AI Primitives](./ai-primitives) | 17 | Prompting, embedding, RAG, evaluation, memory, and AI chains |
| [Battle / Arena](./battle) | 7 | Battle lifecycle — create, execute, judge, vote, score, rank |
| [Storage & I/O](./storage) | 11 | Supabase, KV, file, HTTP, webhook, and GraphQL access |
| [Communication](./communication) | 6 | Email, Slack, Discord, Telegram, push, and SMS delivery |
| [Integrations](./integration) | 11 | GitHub, Notion, RSS, Google Sheets, Linear, Jira, and Calendar |
| [Media Generation](./media) | 8 | Image, audio, video, and speech generation and conversion |
| [Utility](./utility) | 8 | Logging, debugging, caching, rate limiting, and secrets |

## Quick Index

### Triggers
[Manual Trigger](./trigger#manual-trigger) · [Schedule Trigger](./trigger#schedule-trigger) · [Webhook Trigger](./trigger#webhook-trigger) · [Event Trigger](./trigger#event-trigger) · [Form / Input Trigger](./trigger#form-input-trigger)

### Logic
[Code](./logic#code) · [Switch](./logic#switch) · [If / Condition](./logic#if-condition) · [Loop / Map](./logic#loop-map) · [Wait / Delay](./logic#wait-delay) · [Error Catch](./logic#error-catch) · [Try / Catch](./logic#try-catch) · [Merge](./logic#merge) · [Split In Batches](./logic#split-in-batches) · [Sub-Workflow](./logic#sub-workflow) · [Stop / Return](./logic#stop-return)

### Data
[JSON Transform](./data#json-transform) · [Set Variables](./data#set-variables) · [Extract Field](./data#extract-field) · [Rename Field](./data#rename-field) · [Filter Items](./data#filter-items) · [Aggregate](./data#aggregate) · [Sort](./data#sort) · [Deduplicate](./data#deduplicate) · [Text Splitter](./data#text-splitter) · [Data Mapper](./data#data-mapper)

### AI Primitives
[Prompt Template](./ai-primitives#prompt-template) · [Lens Execute](./ai-primitives#lens-execute) · [Agent Execute](./ai-primitives#agent-execute) · [Output Parser](./ai-primitives#output-parser) · [Embedding](./ai-primitives#embedding) · [RAG Retriever](./ai-primitives#rag-retrieval) · [Vector Search](./ai-primitives#vector-search) · [Judge / Eval](./ai-primitives#judge-evaluator) · [Memory Read](./ai-primitives#memory-read) · [Memory Write](./ai-primitives#memory-write) · [Chain](./ai-primitives#chain) · [Summarizer](./ai-primitives#summarizer) · [Classifier](./ai-primitives#classifier) · [Translator](./ai-primitives#translator) · [Image Analyze](./ai-primitives#image-analyze) · [Audio Transcribe](./ai-primitives#audio-transcribe) · [Video Analyze](./ai-primitives#video-analyze)

### Battle / Arena
[Battle Create](./battle#battle-create) · [Battle Execute](./battle#battle-execute) · [Contender Run](./battle#contender-run) · [Judge Battle](./battle#judge-battle) · [Vote Collector](./battle#vote-collector) · [Score Aggregator](./battle#score-aggregator) · [Leaderboard Update](./battle#leaderboard-update)

### Storage & I/O
[Supabase Query](./storage#supabase-query) · [SQL Query](./storage#sql-query) · [KV Read](./storage#kv-store-read) · [KV Write](./storage#kv-store-write) · [File Reader](./storage#file-reader) · [File Writer](./storage#file-writer) · [Object Storage Upload](./storage#object-storage-upload) · [Object Storage Download](./storage#object-storage-download) · [Webhook Send](./storage#webhook-sender) · [HTTP Request](./storage#http-request) · [GraphQL Request](./storage#graphql-request)

### Communication
[Email Send](./communication#email-send) · [Slack Notify](./communication#slack-notify) · [Discord Notify](./communication#discord-notify) · [Telegram Notify](./communication#telegram-notify) · [Push Notification](./communication#push-notification) · [SMS Send](./communication#sms-send)

### Integrations
[GitHub Read](./integration#github-read) · [GitHub PR Review](./integration#github-pr-review) · [GitHub Issue Create](./integration#github-issue-create) · [RSS Feed](./integration#rss-feed) · [Notion Read](./integration#notion-read) · [Notion Write](./integration#notion-write) · [Sheets Read](./integration#google-sheets-read) · [Sheets Write](./integration#google-sheets-write) · [Calendar Create](./integration#calendar-create) · [Linear Issue Create](./integration#linear-issue-create) · [Jira Issue Create](./integration#jira-issue-create)

### Media Generation
[Text to Image](./media#text-to-image) · [Image to Image](./media#image-to-image) · [Image to Audio](./media#image-to-audio) · [Text to Speech](./media#text-to-speech) · [Speech to Text](./media#speech-to-text) · [Text to Video](./media#text-to-video) · [Image Upscale](./media#image-upscale) · [Media Convert](./media#media-convert)

### Utility
[Logger](./utility#logger) · [Debug Inspector](./utility#debug-inspector) · [Secret Resolver](./utility#secret-resolver) · [Rate Limit](./utility#rate-limit) · [Cache Read](./utility#cache-read) · [Cache Write](./utility#cache-write) · [Retry](./utility#retry) · [No-Op](./utility#noop)

---

**See also:** [Workflow Studio How-To](/en/how-to/agents/workspace/workflows) · [Workflow Concepts](/en/explanation/workflows/workflow-concepts) · [Execution Engine](/en/reference/workflows/execution-engine) · [Workflow Templates](/en/tutorials/walkthroughs/create-a-workflow)
