import {
  getNodeRunner,
  registerNodeRunner,
} from './node-runner.registry'
import { AgentExecuteRunner } from './agent-execute.runner'
import { AudioTranscribeRunner } from './audio-transcribe.runner'
import { ChainRunner } from './chain.runner'
import { ClassifierRunner } from './classifier.runner'
import { CodeNodeRunner } from './code-node.runner'
import { EmailSendRunner, SlackNotifyRunner, DiscordNotifyRunner } from './communication.runner'
import { DataMapperRunner } from './data-mapper.runner'
import { DeduplicateRunner } from './deduplicate.runner'
import { EmbeddingRunner } from './embedding.runner'
import { ErrorCatchRunner } from './error-catch.runner'
import { ExtractFieldRunner } from './extract-field.runner'
import { FileReaderRunner } from './file-reader.runner'
import { FileWriterRunner } from './file-writer.runner'
import { FilterItemsRunner } from './filter-items.runner'
import { IfConditionRunner } from './if-condition.runner'
import {
  GitHubReadRunner,
  GoogleSheetsReadRunner,
  GoogleSheetsWriteRunner,
  NotionReadRunner,
  RssFeedRunner,
} from './integration.runner'
import { JsonTransformRunner } from './json-transform.runner'
import { JudgeEvaluatorRunner } from './judge-evaluator.runner'
import { KVStoreReadRunner, KVStoreWriteRunner } from './kv-store.runner'
import { LensExecuteRunner } from './lens-execute.runner'
import { LoopMapRunner } from './loop-map.runner'
import { MergeRunner } from './merge.runner'
import { MemoryReadRunner, MemoryWriteRunner } from './memory.runner'
import { OutputParserRunner } from './output-parser.runner'
import { PromptTemplateRunner } from './prompt-template.runner'
import { RagRetrievalRunner } from './rag-retrieval.runner'
import { RenameFieldRunner } from './rename-field.runner'
import { ScheduleTriggerRunner } from './schedule-trigger.runner'
import { SetVariablesRunner } from './set-variables.runner'
import { SortRunner } from './sort.runner'
import { SplitInBatchesRunner } from './split-in-batches.runner'
import { StopReturnRunner } from './stop-return.runner'
import { SubWorkflowRunner } from './sub-workflow.runner'
import { SupabaseQueryRunner } from './supabase-query.runner'
import { SwitchRunner } from './switch.runner'
import { TextSplitterRunner } from './text-splitter.runner'
import { TranslatorRunner } from './translator.runner'
import { TryCatchRunner } from './try-catch.runner'
import { WaitDelayRunner } from './wait-delay.runner'
import { WebhookTriggerRunner, WebhookSenderRunner } from './webhook.runner'
import { AggregateRunner } from './aggregate.runner'
import { ImageAnalyzeRunner } from './image-analyze.runner'
import { SummarizerRunner } from './summarizer.runner'
import { VectorSearchRunner } from './vector-search.runner'
import { BattleCreateRunner } from './battle/battle-create.runner'
import { BattleExecuteRunner } from './battle/battle-execute.runner'
import { ContenderRunRunner } from './battle/contender-run.runner'
import { JudgeBattleRunner } from './battle/judge-battle.runner'
import { LeaderboardUpdateRunner } from './battle/leaderboard-update.runner'
import { ScoreAggregatorRunner } from './battle/score-aggregator.runner'
import { VoteCollectorRunner } from './battle/vote-collector.runner'
import { EventTriggerRunner } from './trigger/event-trigger.runner'
import { FormInputTriggerRunner } from './trigger/form-input-trigger.runner'
import { ManualTriggerRunner } from './trigger/manual-trigger.runner'
import { CacheReadRunner, CacheWriteRunner } from './utility/cache.runner'
import { DebugInspectorRunner } from './utility/debug-inspector.runner'
import { LoggerRunner } from './utility/logger.runner'
import { NoopRunner } from './utility/noop.runner'
import { RateLimitRunner } from './utility/rate-limit.runner'
import { RetryRunner } from './utility/retry.runner'
import { SecretResolverRunner } from './utility/secret-resolver.runner'
import { ImageToAudioRunner } from './media/image-to-audio.runner'
import { ImageToImageRunner } from './media/image-to-image.runner'
import { ImageUpscaleRunner } from './media/image-upscale.runner'
import { MediaConvertRunner } from './media/media-convert.runner'
import { SpeechToTextRunner } from './media/speech-to-text.runner'
import { TextToImageRunner } from './media/text-to-image.runner'
import { TextToSpeechRunner } from './media/text-to-speech.runner'
import { TextToVideoRunner } from './media/text-to-video.runner'
import { VideoAnalyzeRunner } from './video-analyze.runner'

import type { INodeRunner } from './node-runner.interface'

const runnerFactories: Array<() => INodeRunner> = [
  () => new ManualTriggerRunner(),
  () => new ScheduleTriggerRunner(),
  () => new WebhookTriggerRunner(),
  () => new EventTriggerRunner(),
  () => new FormInputTriggerRunner(),
  () => new CodeNodeRunner(),
  () => new SwitchRunner(),
  () => new IfConditionRunner(),
  () => new LoopMapRunner(),
  () => new WaitDelayRunner(),
  () => new ErrorCatchRunner(),
  () => new TryCatchRunner(),
  () => new MergeRunner(),
  () => new SplitInBatchesRunner(),
  () => new SubWorkflowRunner(),
  () => new StopReturnRunner(),
  () => new JsonTransformRunner(),
  () => new SetVariablesRunner(),
  () => new ExtractFieldRunner(),
  () => new RenameFieldRunner(),
  () => new FilterItemsRunner(),
  () => new AggregateRunner(),
  () => new SortRunner(),
  () => new DeduplicateRunner(),
  () => new TextSplitterRunner(),
  () => new DataMapperRunner(),
  () => new PromptTemplateRunner(),
  () => new LensExecuteRunner(),
  () => new AgentExecuteRunner(),
  () => new OutputParserRunner(),
  () => new EmbeddingRunner(),
  () => new RagRetrievalRunner(),
  () => new VectorSearchRunner(),
  () => new JudgeEvaluatorRunner(),
  () => new MemoryReadRunner(),
  () => new MemoryWriteRunner(),
  () => new ChainRunner(),
  () => new SummarizerRunner(),
  () => new ClassifierRunner(),
  () => new TranslatorRunner(),
  () => new ImageAnalyzeRunner(),
  () => new AudioTranscribeRunner(),
  () => new VideoAnalyzeRunner(),
  () => new BattleCreateRunner(),
  () => new BattleExecuteRunner(),
  () => new ContenderRunRunner(),
  () => new JudgeBattleRunner(),
  () => new VoteCollectorRunner(),
  () => new ScoreAggregatorRunner(),
  () => new LeaderboardUpdateRunner(),
  () => new SupabaseQueryRunner(),
  () => new KVStoreReadRunner(),
  () => new KVStoreWriteRunner(),
  () => new FileReaderRunner(),
  () => new FileWriterRunner(),
  () => new WebhookSenderRunner(),
  () => new GitHubReadRunner(),
  () => new RssFeedRunner(),
  () => new NotionReadRunner(),
  () => new GoogleSheetsReadRunner(),
  () => new GoogleSheetsWriteRunner(),
  () => new EmailSendRunner(),
  () => new SlackNotifyRunner(),
  () => new DiscordNotifyRunner(),
  () => new TextToImageRunner(),
  () => new ImageToImageRunner(),
  () => new ImageToAudioRunner(),
  () => new TextToSpeechRunner(),
  () => new SpeechToTextRunner(),
  () => new TextToVideoRunner(),
  () => new ImageUpscaleRunner(),
  () => new MediaConvertRunner(),
  () => new LoggerRunner(),
  () => new DebugInspectorRunner(),
  () => new SecretResolverRunner(),
  () => new RateLimitRunner(),
  () => new CacheReadRunner(),
  () => new CacheWriteRunner(),
  () => new RetryRunner(),
  () => new NoopRunner(),
]

export function registerDefaultNodeRunners(): void {
  for (const createRunner of runnerFactories) {
    const runner = createRunner()
    if (!getNodeRunner(runner.nodeType)) {
      registerNodeRunner(runner)
    }
  }
}
