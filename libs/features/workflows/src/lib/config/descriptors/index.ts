// CT — Triggers
export {
  manualTriggerDescriptor,
  eventTriggerDescriptor,
  formInputTriggerDescriptor,
} from './ct-trigger.descriptors'

// CN — Logic
export { waitDelayDescriptor, loopMapDescriptor, errorCatchDescriptor } from './cn-logic.descriptors'

// CN — Logic Extended
export {
  ifConditionDescriptor,
  tryCatchDescriptor,
  mergeDescriptor,
  splitInBatchesDescriptor,
  stopReturnDescriptor,
} from './cn-logic-extended.descriptors'

// CN — Data
export { jsonTransformDescriptor } from './cn-data.descriptors'

// CN — Data Extended
export {
  extractFieldDescriptor,
  renameFieldDescriptor,
  filterItemsDescriptor,
  aggregateDescriptor,
  sortDescriptor,
  deduplicateDescriptor,
  textSplitterDescriptor,
  dataMapperDescriptor,
} from './cn-data-extended.descriptors'

// CO — AI Primitives
export {
  promptTemplateDescriptor,
  outputParserDescriptor,
  embeddingDescriptor,
  ragRetrievalDescriptor,
  judgeEvaluatorDescriptor,
  memoryReadDescriptor,
  memoryWriteDescriptor,
  chainDescriptor,
} from './co-ai-primitives.descriptors'

// CO — AI Extended
export {
  lensExecuteDescriptor,
  agentExecuteDescriptor,
  vectorSearchDescriptor,
  summarizerDescriptor,
  classifierDescriptor,
  translatorDescriptor,
  imageAnalyzeDescriptor,
  audioTranscribeDescriptor,
  videoAnalyzeDescriptor,
} from './co-ai-extended.descriptors'

// CX — Battle
export {
  battleCreateDescriptor,
  battleExecuteDescriptor,
  contenderRunDescriptor,
  judgeBattleDescriptor,
  voteCollectorDescriptor,
  scoreAggregatorDescriptor,
  leaderboardUpdateDescriptor,
} from './cx-battle.descriptors'

// CP — Storage & I/O
export {
  supabaseQueryDescriptor,
  kvStoreReadDescriptor,
  kvStoreWriteDescriptor,
  fileReaderDescriptor,
  fileWriterDescriptor,
  webhookTriggerDescriptor,
  webhookSenderDescriptor,
  scheduleTriggerDescriptor,
} from './cp-storage-io.descriptors'

// CP — Storage Extended
export {
  sqlQueryDescriptor,
  objectStorageUploadDescriptor,
  objectStorageDownloadDescriptor,
  httpRequestDescriptor,
  graphqlRequestDescriptor,
} from './cp-storage-extended.descriptors'

// CQ — Communication
export {
  emailSendDescriptor,
  slackNotifyDescriptor,
  discordNotifyDescriptor,
} from './cq-communication.descriptors'

// CQ — Communication Extended
export {
  telegramNotifyDescriptor,
  pushNotificationDescriptor,
  smsSendDescriptor,
} from './cq-communication-extended.descriptors'

// CQ — Integration
export {
  githubReadDescriptor,
  rssFeedDescriptor,
  notionReadDescriptor,
  googleSheetsReadDescriptor,
  googleSheetsWriteDescriptor,
} from './cq-integration.descriptors'

// CQ — Integration Extended
export {
  githubPrReviewDescriptor,
  githubIssueCreateDescriptor,
  notionWriteDescriptor,
  calendarCreateDescriptor,
  linearIssueCreateDescriptor,
  jiraIssueCreateDescriptor,
} from './cq-integration-extended.descriptors'

// CM — Media
export {
  textToImageDescriptor,
  imageToImageDescriptor,
  imageToAudioDescriptor,
  textToSpeechDescriptor,
  speechToTextDescriptor,
  textToVideoDescriptor,
  imageUpscaleDescriptor,
  mediaConvertDescriptor,
} from './cm-media.descriptors'

// CU — Utility
export {
  loggerDescriptor,
  debugInspectorDescriptor,
  secretResolverDescriptor,
  rateLimitDescriptor,
  cacheReadDescriptor,
  cacheWriteDescriptor,
  retryDescriptor,
  noopDescriptor,
} from './cu-utility.descriptors'
