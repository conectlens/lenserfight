/**
 * runner-config.bootstrap — registers all runner config descriptors and custom forms.
 *
 * Call once at app init (e.g., in the workflow builder page or provider).
 */

import { registerRunnerConfig } from './runner-config.registry'

// Custom forms (complex UIs)
import { CodeNodeConfigForm } from './forms/CodeNodeConfigForm'
import { SetVariablesConfigForm } from './forms/SetVariablesConfigForm'
import { SubWorkflowConfigForm } from './forms/SubWorkflowConfigForm'
import { SwitchConfigForm } from './forms/SwitchConfigForm'

// Descriptors
import {
  // CT — Triggers
  manualTriggerDescriptor,
  eventTriggerDescriptor,
  formInputTriggerDescriptor,
  // CN — Logic
  waitDelayDescriptor,
  loopMapDescriptor,
  errorCatchDescriptor,
  // CN — Logic Extended
  ifConditionDescriptor,
  tryCatchDescriptor,
  mergeDescriptor,
  splitInBatchesDescriptor,
  stopReturnDescriptor,
  // CN — Data
  jsonTransformDescriptor,
  // CN — Data Extended
  extractFieldDescriptor,
  renameFieldDescriptor,
  filterItemsDescriptor,
  aggregateDescriptor,
  sortDescriptor,
  deduplicateDescriptor,
  textSplitterDescriptor,
  dataMapperDescriptor,
  // CO — AI Primitives
  promptTemplateDescriptor,
  outputParserDescriptor,
  embeddingDescriptor,
  ragRetrievalDescriptor,
  judgeEvaluatorDescriptor,
  memoryReadDescriptor,
  memoryWriteDescriptor,
  chainDescriptor,
  // CO — AI Extended
  lensExecuteDescriptor,
  agentExecuteDescriptor,
  vectorSearchDescriptor,
  summarizerDescriptor,
  classifierDescriptor,
  translatorDescriptor,
  imageAnalyzeDescriptor,
  audioTranscribeDescriptor,
  videoAnalyzeDescriptor,
  // CX — Battle
  battleCreateDescriptor,
  battleExecuteDescriptor,
  contenderRunDescriptor,
  judgeBattleDescriptor,
  voteCollectorDescriptor,
  scoreAggregatorDescriptor,
  leaderboardUpdateDescriptor,
  // CP — Storage & I/O
  supabaseQueryDescriptor,
  kvStoreReadDescriptor,
  kvStoreWriteDescriptor,
  fileReaderDescriptor,
  fileWriterDescriptor,
  webhookTriggerDescriptor,
  webhookSenderDescriptor,
  scheduleTriggerDescriptor,
  // CP — Storage Extended
  sqlQueryDescriptor,
  objectStorageUploadDescriptor,
  objectStorageDownloadDescriptor,
  httpRequestDescriptor,
  graphqlRequestDescriptor,
  // CQ — Communication
  emailSendDescriptor,
  slackNotifyDescriptor,
  discordNotifyDescriptor,
  // CQ — Communication Extended
  telegramNotifyDescriptor,
  pushNotificationDescriptor,
  smsSendDescriptor,
  // CQ — Integration
  githubReadDescriptor,
  rssFeedDescriptor,
  notionReadDescriptor,
  googleSheetsReadDescriptor,
  googleSheetsWriteDescriptor,
  // CQ — Integration Extended
  githubPrReviewDescriptor,
  githubIssueCreateDescriptor,
  notionWriteDescriptor,
  calendarCreateDescriptor,
  linearIssueCreateDescriptor,
  jiraIssueCreateDescriptor,
  // CM — Media
  textToImageDescriptor,
  imageToImageDescriptor,
  imageToAudioDescriptor,
  textToSpeechDescriptor,
  speechToTextDescriptor,
  textToVideoDescriptor,
  imageUpscaleDescriptor,
  mediaConvertDescriptor,
  // CU — Utility
  loggerDescriptor,
  debugInspectorDescriptor,
  secretResolverDescriptor,
  rateLimitDescriptor,
  cacheReadDescriptor,
  cacheWriteDescriptor,
  retryDescriptor,
  noopDescriptor,
} from './descriptors'

let bootstrapped = false

export function bootstrapRunnerConfigs(): void {
  if (bootstrapped) return
  bootstrapped = true

  // ── Custom forms (complex UIs) ──────────────────────────────────────────
  registerRunnerConfig('code', { kind: 'custom', component: CodeNodeConfigForm })
  registerRunnerConfig('switch', { kind: 'custom', component: SwitchConfigForm })
  registerRunnerConfig('set_variables', { kind: 'custom', component: SetVariablesConfigForm })
  registerRunnerConfig('sub_workflow', { kind: 'custom', component: SubWorkflowConfigForm })

  // ── CT — Triggers ──────────────────────────────────────────────────────
  registerRunnerConfig('manual_trigger', { kind: 'descriptor', descriptor: manualTriggerDescriptor })
  registerRunnerConfig('event_trigger', { kind: 'descriptor', descriptor: eventTriggerDescriptor })
  registerRunnerConfig('form_input_trigger', { kind: 'descriptor', descriptor: formInputTriggerDescriptor })

  // ── CN — Logic ──────────────────────────────────────────────────────────
  registerRunnerConfig('wait_delay', { kind: 'descriptor', descriptor: waitDelayDescriptor })
  registerRunnerConfig('loop_map', { kind: 'descriptor', descriptor: loopMapDescriptor })
  registerRunnerConfig('error_catch', { kind: 'descriptor', descriptor: errorCatchDescriptor })

  // ── CN — Logic Extended ─────────────────────────────────────────────────
  registerRunnerConfig('if_condition', { kind: 'descriptor', descriptor: ifConditionDescriptor })
  registerRunnerConfig('try_catch', { kind: 'descriptor', descriptor: tryCatchDescriptor })
  registerRunnerConfig('merge', { kind: 'descriptor', descriptor: mergeDescriptor })
  registerRunnerConfig('split_in_batches', { kind: 'descriptor', descriptor: splitInBatchesDescriptor })
  registerRunnerConfig('stop_return', { kind: 'descriptor', descriptor: stopReturnDescriptor })

  // ── CN — Data ───────────────────────────────────────────────────────────
  registerRunnerConfig('json_transform', { kind: 'descriptor', descriptor: jsonTransformDescriptor })

  // ── CN — Data Extended ──────────────────────────────────────────────────
  registerRunnerConfig('extract_field', { kind: 'descriptor', descriptor: extractFieldDescriptor })
  registerRunnerConfig('rename_field', { kind: 'descriptor', descriptor: renameFieldDescriptor })
  registerRunnerConfig('filter_items', { kind: 'descriptor', descriptor: filterItemsDescriptor })
  registerRunnerConfig('aggregate', { kind: 'descriptor', descriptor: aggregateDescriptor })
  registerRunnerConfig('sort', { kind: 'descriptor', descriptor: sortDescriptor })
  registerRunnerConfig('deduplicate', { kind: 'descriptor', descriptor: deduplicateDescriptor })
  registerRunnerConfig('text_splitter', { kind: 'descriptor', descriptor: textSplitterDescriptor })
  registerRunnerConfig('data_mapper', { kind: 'descriptor', descriptor: dataMapperDescriptor })

  // ── CO — AI Primitives ──────────────────────────────────────────────────
  registerRunnerConfig('prompt_template', { kind: 'descriptor', descriptor: promptTemplateDescriptor })
  registerRunnerConfig('output_parser', { kind: 'descriptor', descriptor: outputParserDescriptor })
  registerRunnerConfig('embedding', { kind: 'descriptor', descriptor: embeddingDescriptor })
  registerRunnerConfig('rag_retrieval', { kind: 'descriptor', descriptor: ragRetrievalDescriptor })
  registerRunnerConfig('judge_evaluator', { kind: 'descriptor', descriptor: judgeEvaluatorDescriptor })
  registerRunnerConfig('memory_read', { kind: 'descriptor', descriptor: memoryReadDescriptor })
  registerRunnerConfig('memory_write', { kind: 'descriptor', descriptor: memoryWriteDescriptor })
  registerRunnerConfig('chain', { kind: 'descriptor', descriptor: chainDescriptor })

  // ── CO — AI Extended ────────────────────────────────────────────────────
  registerRunnerConfig('lens_execute', { kind: 'descriptor', descriptor: lensExecuteDescriptor })
  registerRunnerConfig('agent_execute', { kind: 'descriptor', descriptor: agentExecuteDescriptor })
  registerRunnerConfig('vector_search', { kind: 'descriptor', descriptor: vectorSearchDescriptor })
  registerRunnerConfig('summarizer', { kind: 'descriptor', descriptor: summarizerDescriptor })
  registerRunnerConfig('classifier', { kind: 'descriptor', descriptor: classifierDescriptor })
  registerRunnerConfig('translator', { kind: 'descriptor', descriptor: translatorDescriptor })
  registerRunnerConfig('image_analyze', { kind: 'descriptor', descriptor: imageAnalyzeDescriptor })
  registerRunnerConfig('audio_transcribe', { kind: 'descriptor', descriptor: audioTranscribeDescriptor })
  registerRunnerConfig('video_analyze', { kind: 'descriptor', descriptor: videoAnalyzeDescriptor })

  // ── CX — Battle ────────────────────────────────────────────────────────
  registerRunnerConfig('battle_create', { kind: 'descriptor', descriptor: battleCreateDescriptor })
  registerRunnerConfig('battle_execute', { kind: 'descriptor', descriptor: battleExecuteDescriptor })
  registerRunnerConfig('contender_run', { kind: 'descriptor', descriptor: contenderRunDescriptor })
  registerRunnerConfig('judge_battle', { kind: 'descriptor', descriptor: judgeBattleDescriptor })
  registerRunnerConfig('vote_collector', { kind: 'descriptor', descriptor: voteCollectorDescriptor })
  registerRunnerConfig('score_aggregator', { kind: 'descriptor', descriptor: scoreAggregatorDescriptor })
  registerRunnerConfig('leaderboard_update', { kind: 'descriptor', descriptor: leaderboardUpdateDescriptor })

  // ── CP — Storage & I/O ─────────────────────────────────────────────────
  registerRunnerConfig('supabase_query', { kind: 'descriptor', descriptor: supabaseQueryDescriptor })
  registerRunnerConfig('kv_store_read', { kind: 'descriptor', descriptor: kvStoreReadDescriptor })
  registerRunnerConfig('kv_store_write', { kind: 'descriptor', descriptor: kvStoreWriteDescriptor })
  registerRunnerConfig('file_reader', { kind: 'descriptor', descriptor: fileReaderDescriptor })
  registerRunnerConfig('file_writer', { kind: 'descriptor', descriptor: fileWriterDescriptor })
  registerRunnerConfig('webhook_trigger', { kind: 'descriptor', descriptor: webhookTriggerDescriptor })
  registerRunnerConfig('webhook_sender', { kind: 'descriptor', descriptor: webhookSenderDescriptor })
  registerRunnerConfig('schedule_trigger', { kind: 'descriptor', descriptor: scheduleTriggerDescriptor })

  // ── CP — Storage Extended ───────────────────────────────────────────────
  registerRunnerConfig('sql_query', { kind: 'descriptor', descriptor: sqlQueryDescriptor })
  registerRunnerConfig('object_storage_upload', { kind: 'descriptor', descriptor: objectStorageUploadDescriptor })
  registerRunnerConfig('object_storage_download', { kind: 'descriptor', descriptor: objectStorageDownloadDescriptor })
  registerRunnerConfig('http_request', { kind: 'descriptor', descriptor: httpRequestDescriptor })
  registerRunnerConfig('graphql_request', { kind: 'descriptor', descriptor: graphqlRequestDescriptor })

  // ── CQ — Communication ─────────────────────────────────────────────────
  registerRunnerConfig('email_send', { kind: 'descriptor', descriptor: emailSendDescriptor })
  registerRunnerConfig('slack_notify', { kind: 'descriptor', descriptor: slackNotifyDescriptor })
  registerRunnerConfig('discord_notify', { kind: 'descriptor', descriptor: discordNotifyDescriptor })

  // ── CQ — Communication Extended ────────────────────────────────────────
  registerRunnerConfig('telegram_notify', { kind: 'descriptor', descriptor: telegramNotifyDescriptor })
  registerRunnerConfig('push_notification', { kind: 'descriptor', descriptor: pushNotificationDescriptor })
  registerRunnerConfig('sms_send', { kind: 'descriptor', descriptor: smsSendDescriptor })

  // ── CQ — Integration ───────────────────────────────────────────────────
  registerRunnerConfig('github_read', { kind: 'descriptor', descriptor: githubReadDescriptor })
  registerRunnerConfig('rss_feed', { kind: 'descriptor', descriptor: rssFeedDescriptor })
  registerRunnerConfig('notion_read', { kind: 'descriptor', descriptor: notionReadDescriptor })
  registerRunnerConfig('google_sheets_read', { kind: 'descriptor', descriptor: googleSheetsReadDescriptor })
  registerRunnerConfig('google_sheets_write', { kind: 'descriptor', descriptor: googleSheetsWriteDescriptor })

  // ── CQ — Integration Extended ──────────────────────────────────────────
  registerRunnerConfig('github_pr_review', { kind: 'descriptor', descriptor: githubPrReviewDescriptor })
  registerRunnerConfig('github_issue_create', { kind: 'descriptor', descriptor: githubIssueCreateDescriptor })
  registerRunnerConfig('notion_write', { kind: 'descriptor', descriptor: notionWriteDescriptor })
  registerRunnerConfig('calendar_create', { kind: 'descriptor', descriptor: calendarCreateDescriptor })
  registerRunnerConfig('linear_issue_create', { kind: 'descriptor', descriptor: linearIssueCreateDescriptor })
  registerRunnerConfig('jira_issue_create', { kind: 'descriptor', descriptor: jiraIssueCreateDescriptor })

  // ── CM — Media ─────────────────────────────────────────────────────────
  registerRunnerConfig('text_to_image', { kind: 'descriptor', descriptor: textToImageDescriptor })
  registerRunnerConfig('image_to_image', { kind: 'descriptor', descriptor: imageToImageDescriptor })
  registerRunnerConfig('image_to_audio', { kind: 'descriptor', descriptor: imageToAudioDescriptor })
  registerRunnerConfig('text_to_speech', { kind: 'descriptor', descriptor: textToSpeechDescriptor })
  registerRunnerConfig('speech_to_text', { kind: 'descriptor', descriptor: speechToTextDescriptor })
  registerRunnerConfig('text_to_video', { kind: 'descriptor', descriptor: textToVideoDescriptor })
  registerRunnerConfig('image_upscale', { kind: 'descriptor', descriptor: imageUpscaleDescriptor })
  registerRunnerConfig('media_convert', { kind: 'descriptor', descriptor: mediaConvertDescriptor })

  // ── CU — Utility ───────────────────────────────────────────────────────
  registerRunnerConfig('logger', { kind: 'descriptor', descriptor: loggerDescriptor })
  registerRunnerConfig('debug_inspector', { kind: 'descriptor', descriptor: debugInspectorDescriptor })
  registerRunnerConfig('secret_resolver', { kind: 'descriptor', descriptor: secretResolverDescriptor })
  registerRunnerConfig('rate_limit', { kind: 'descriptor', descriptor: rateLimitDescriptor })
  registerRunnerConfig('cache_read', { kind: 'descriptor', descriptor: cacheReadDescriptor })
  registerRunnerConfig('cache_write', { kind: 'descriptor', descriptor: cacheWriteDescriptor })
  registerRunnerConfig('retry', { kind: 'descriptor', descriptor: retryDescriptor })
  registerRunnerConfig('noop', { kind: 'descriptor', descriptor: noopDescriptor })
}
