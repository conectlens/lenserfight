#!/usr/bin/env bash
set -euo pipefail

# check-node-docs.sh
# Verifies that every WorkflowNodeType has a corresponding reference doc under
# docs/en/reference/workflow-nodes/<type>.md
# Exits 1 with MISSING: lines if any are absent, 0 if all present.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$ROOT/docs/en/reference/workflow-nodes"

# Complete list of WorkflowNodeType values — keep in sync with
# libs/infra/execution/src/lib/execution.types.ts
NODE_TYPES=(
  # Core media
  text
  image
  video
  audio
  multimodal_chain
  delegate

  # Flow control
  condition
  merge

  # CT — Triggers
  manual_trigger
  event_trigger
  form_input_trigger

  # CN — Logic & Data Foundation
  code
  json_transform
  set_variables
  switch
  loop_map
  wait_delay
  error_catch
  sub_workflow
  if_condition
  try_catch
  split_in_batches
  stop_return

  # CN — Data Extended
  extract_field
  rename_field
  filter_items
  aggregate
  sort
  deduplicate
  text_splitter
  data_mapper

  # CO — AI Primitive Nodes
  prompt_template
  output_parser
  embedding
  rag_retrieval
  judge_evaluator
  memory_read
  memory_write
  chain
  lens_execute
  agent_execute
  vector_search
  summarizer
  classifier
  translator
  image_analyze
  audio_transcribe
  video_analyze

  # CX — Battle / Arena
  battle_create
  battle_execute
  contender_run
  judge_battle
  vote_collector
  score_aggregator
  leaderboard_update

  # CU — Series advancement
  series_advance

  # CP — Storage & I/O Nodes
  supabase_query
  kv_store_read
  kv_store_write
  file_reader
  file_writer
  webhook_trigger
  webhook_sender
  schedule_trigger
  sql_query
  object_storage_upload
  object_storage_download
  http_request
  graphql_request

  # CQ — Communication & Integrations
  email_send
  slack_notify
  discord_notify
  telegram_notify
  push_notification
  sms_send
  github_read
  github_pr_review
  github_issue_create
  rss_feed
  notion_read
  notion_write
  google_sheets_read
  google_sheets_write
  calendar_create
  linear_issue_create
  jira_issue_create
  asana_task_create
  asana_task_update
  asana_project_tasks_list
  monday_item_create
  monday_item_update
  monday_board_items_list
  zapier_webhook_trigger

  # CM — Media Generation
  text_to_image
  image_to_image
  image_to_audio
  text_to_speech
  speech_to_text
  text_to_video
  image_upscale
  media_convert

  # CU — Utility
  logger
  debug_inspector
  secret_resolver
  rate_limit
  cache_read
  cache_write
  retry
  noop
)

MISSING=()

for type in "${NODE_TYPES[@]}"; do
  if [[ ! -f "$DOCS_DIR/$type.md" ]]; then
    MISSING+=("$type")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "Workflow node docs missing (${#MISSING[@]} of ${#NODE_TYPES[@]}):"
  for type in "${MISSING[@]}"; do
    echo "  MISSING: $DOCS_DIR/$type.md"
  done
  exit 1
fi

echo "All ${#NODE_TYPES[@]} workflow node docs present"
