/**
 * CO — AI Extended node config descriptors.
 *
 * Covers: lens_execute, agent_execute, vector_search, summarizer,
 *         classifier, translator, image_analyze, audio_transcribe, video_analyze.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const lensExecuteDescriptor: RunnerConfigDescriptor = {
  nodeType: 'lens_execute',
  displayName: 'Lens Execute',
  category: 'ai_primitive',
  needsAiProvider: true,
  fields: [
    {
      key: 'lensId',
      label: 'Lens ID',
      type: 'text',
      required: true,
      hint: 'The ID of the lens to execute in this workflow step.',
      tooltip: {
        summary: 'The lens to execute. Values map into the Lens [[parameter]] placeholders.',
        whenRequired: 'Always required — identifies which prompt template to run.',
        format: 'UUID lens ID. Typically auto-filled when adding a lens node from the palette.',
        executionImpact: 'The lens body is fetched at runtime. Parameters are resolved from upstream outputs and static overrides, then sent to the AI model.',
      },
    },
    {
      key: 'versionId',
      label: 'Version',
      type: 'text',
      placeholder: 'Latest published (default)',
      hint: 'Pin to a specific lens version ID. Leave empty for latest published.',
      tooltip: {
        summary: 'Pin execution to a specific version of the lens.',
        format: 'UUID version ID or leave empty for latest published version.',
        commonMistakes: 'Pinning to a draft version that hasn\'t been published yet. Pinning to a deleted version.',
        executionImpact: 'If empty, always uses the latest published version. Pinning ensures reproducible results across runs.',
      },
    },
    {
      key: 'temperature',
      label: 'Temperature',
      type: 'number',
      min: 0,
      max: 2,
      step: 0.1,
      hint: 'Controls randomness. Lower = more deterministic.',
      tooltip: {
        summary: 'Controls the randomness/creativity of the AI output.',
        format: 'Number from 0 to 2. Default varies by model (typically 0.7).',
        executionImpact: '0 = deterministic (same input → same output). Higher values produce more creative but less predictable results.',
      },
    },
    {
      key: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
      min: 1,
      max: 16384,
      hint: 'Maximum tokens to generate.',
      tooltip: {
        summary: 'Upper limit on generated output length.',
        format: 'Integer, 1–16384. If unset, uses model default.',
        executionImpact: 'Higher values allow longer responses but cost more. Output is truncated at this limit, not the prompt.',
      },
    },
    {
      key: 'connectorSlug',
      label: 'Connector',
      type: 'text',
      hint: 'Optional connector slug for credential-backed parameters (e.g. API key injection).',
      tooltip: {
        summary: 'Inject credentials from a configured connector into lens [[parameter]] placeholders.',
        whenRequired: 'Only needed if the lens has parameters that resolve to external API keys or secrets.',
        format: 'Connector slug string (e.g. "openai_key", "stripe_secret").',
        executionImpact: 'The connector credential is resolved at runtime and injected securely. Never appears in logs or outputs.',
      },
    },
  ],
  outputFields: [
    { key: 'text', type: 'string', description: 'Generated text output' },
    { key: 'result', type: 'object', description: 'Full structured execution result' },
    { key: 'media', type: 'object', description: 'Media metadata (for image/video/audio lens kinds)' },
  ],
}

export const agentExecuteDescriptor: RunnerConfigDescriptor = {
  nodeType: 'agent_execute',
  displayName: 'Agent Execute',
  category: 'ai_primitive',
  needsAiProvider: true,
  fields: [
    {
      key: 'agentLensId',
      label: 'Agent Lens ID',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The lens that defines the agent behavior, persona, and base prompt.',
        whenRequired: 'Always required — identifies which agent lens to run.',
        format: 'UUID lens ID. Typically auto-filled from the lens picker.',
      },
    },
    {
      key: 'maxSteps',
      label: 'Max Steps',
      type: 'number',
      defaultValue: '10',
      min: 1,
      max: 50,
      tooltip: {
        summary: 'Maximum number of reasoning/action steps the agent can take before being forced to return a result.',
        format: 'Integer between 1 and 50.',
        executionImpact: 'Each step may invoke tools and make AI calls. Higher values allow more complex reasoning but increase cost and latency linearly.',
      },
    },
    {
      key: 'tools',
      label: 'Available Tools',
      type: 'string_array',
      hint: 'Add tool names the agent can use.',
      tooltip: {
        summary: 'The set of tools the agent is allowed to invoke during execution.',
        format: 'Array of tool name strings (e.g. ["web_search", "calculator"]).',
        commonMistakes: 'Listing tools that are not registered in the workflow context, which causes the agent to fail when it tries to use them.',
        executionImpact: 'More tools give the agent more capabilities but increase prompt size. Each tool invocation counts as a step.',
      },
    },
    {
      key: 'memoryKey',
      label: 'Memory Key',
      type: 'text',
      hint: 'Optional key for persistent agent memory.',
      tooltip: {
        summary: 'A key for storing and retrieving the agent conversation history across workflow runs.',
        format: 'String key (e.g. agent_session, task_memory). Leave empty for no persistence.',
        executionImpact: 'When set, the agent retains context between runs. Without it, each run starts with a blank conversation.',
      },
    },
  ],
  outputFields: [
    { key: 'result', type: 'object', description: 'Agent execution result' },
    { key: 'steps', type: 'array', description: 'Step-by-step execution trace' },
  ],
}

export const vectorSearchDescriptor: RunnerConfigDescriptor = {
  nodeType: 'vector_search',
  displayName: 'Vector Search',
  category: 'ai_primitive',
  needsAiProvider: true,
  fields: [
    {
      key: 'collection',
      label: 'Collection',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The name of the vector collection (index) to search in.',
        whenRequired: 'Always required — identifies the target vector store.',
        format: 'Collection name string as configured in the vector store.',
      },
    },
    {
      key: 'topK',
      label: 'Top K Results',
      type: 'number',
      defaultValue: '5',
      min: 1,
      max: 100,
      tooltip: {
        summary: 'Maximum number of matching documents to return from the vector search.',
        format: 'Integer between 1 and 100.',
        executionImpact: 'Higher values return more results but increase downstream processing time and token cost if fed into an AI node.',
      },
    },
    {
      key: 'minScore',
      label: 'Minimum Score',
      type: 'number',
      defaultValue: '0.75',
      min: 0,
      max: 1,
      step: 0.05,
      tooltip: {
        summary: 'Minimum cosine similarity score. Documents below this threshold are excluded.',
        format: 'Decimal between 0 and 1. Default 0.75 filters low-relevance results.',
        commonMistakes: 'Setting too high (0.95+) returns almost nothing. Setting too low (0.1) returns irrelevant noise.',
      },
    },
    {
      key: 'filter',
      label: 'Metadata Filter',
      type: 'json',
      hint: 'Optional filter object for metadata.',
      tooltip: {
        summary: 'Pre-filters documents by metadata before vector similarity scoring.',
        format: 'JSON object matching the vector store filter syntax (e.g. { "category": "battle", "year": 2026 }).',
        executionImpact: 'Filters are applied before similarity search, which reduces the candidate set and improves relevance.',
      },
    },
    {
      key: 'includeMetadata',
      label: 'Include Metadata',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether to include document metadata alongside the content in the results.',
        executionImpact: 'When false, only document text and scores are returned, reducing output size.',
      },
    },
  ],
  outputFields: [
    { key: 'results', type: 'array', description: 'Matched documents with scores' },
  ],
}

export const summarizerDescriptor: RunnerConfigDescriptor = {
  nodeType: 'summarizer',
  displayName: 'Summarizer',
  category: 'ai_primitive',
  needsAiProvider: true,
  fields: [
    {
      key: 'strategy',
      label: 'Strategy',
      type: 'select',
      defaultValue: 'map_reduce',
      options: [
        { label: 'Map Reduce', value: 'map_reduce' },
        { label: 'Refine', value: 'refine' },
        { label: 'Stuff', value: 'stuff' },
      ],
      tooltip: {
        summary: 'The summarization algorithm. Map Reduce splits text and merges summaries. Refine iteratively improves. Stuff sends all text at once.',
        commonMistakes: 'Using Stuff for very long documents that exceed the model context window.',
        executionImpact: 'Map Reduce uses multiple AI calls (higher cost, handles long text). Stuff uses one call (cheapest, but limited by context).',
      },
    },
    {
      key: 'maxLength',
      label: 'Max Length',
      type: 'number',
      defaultValue: '500',
      min: 50,
      max: 5000,
      tooltip: {
        summary: 'Target maximum length of the generated summary in tokens.',
        format: 'Integer between 50 and 5000.',
        executionImpact: 'The AI is instructed to stay within this limit. Actual output may be slightly shorter or longer.',
      },
    },
    {
      key: 'language',
      label: 'Language',
      type: 'text',
      defaultValue: 'en',
      tooltip: {
        summary: 'The language the summary should be written in.',
        format: 'ISO 639-1 code (e.g. en, tr, de, fr).',
        executionImpact: 'The AI generates the summary in this language regardless of the input language.',
      },
    },
    {
      key: 'focusAreas',
      label: 'Focus Areas',
      type: 'text',
      hint: 'Comma-separated areas to focus the summary on.',
      tooltip: {
        summary: 'Topics or aspects the summary should prioritize. The AI emphasizes these areas in the output.',
        format: 'Comma-separated keywords (e.g. performance, security, user impact).',
      },
    },
  ],
  outputFields: [
    { key: 'summary', type: 'string', description: 'Generated summary' },
  ],
}

export const classifierDescriptor: RunnerConfigDescriptor = {
  nodeType: 'classifier',
  displayName: 'Classifier',
  category: 'ai_primitive',
  needsAiProvider: true,
  fields: [
    {
      key: 'categories',
      label: 'Categories',
      type: 'string_array',
      required: true,
      hint: 'Add category labels.',
      tooltip: {
        summary: 'The list of possible classification labels the AI can assign to the input.',
        format: 'Array of strings (e.g. ["positive", "negative", "neutral"]).',
        commonMistakes: 'Adding too many overlapping categories, which reduces classification accuracy.',
      },
    },
    {
      key: 'examples',
      label: 'Few-Shot Examples',
      type: 'json',
      hint: 'Optional array of { text, label } examples.',
      tooltip: {
        summary: 'Example text-label pairs that teach the AI how to classify inputs. Improves accuracy significantly.',
        format: 'JSON array: [{ "text": "Great product!", "label": "positive" }]. 3-5 examples per category recommended.',
        executionImpact: 'Each example adds to the prompt token count. More examples improve accuracy but increase cost.',
      },
    },
    {
      key: 'multiLabel',
      label: 'Multi-Label',
      type: 'boolean',
      defaultValue: 'false',
      tooltip: {
        summary: 'Whether the classifier can assign multiple labels to a single input.',
        executionImpact: 'When true, the output may contain multiple labels with individual confidence scores. When false, only the top label is returned.',
      },
    },
    {
      key: 'threshold',
      label: 'Confidence Threshold',
      type: 'number',
      defaultValue: '0.6',
      min: 0,
      max: 1,
      step: 0.05,
      tooltip: {
        summary: 'Minimum confidence score required for a label to be included in the output.',
        format: 'Decimal between 0 and 1. Default 0.6 filters low-confidence predictions.',
        commonMistakes: 'Setting too high (0.95) causes many inputs to have no label. Setting too low (0.1) produces noisy results.',
      },
    },
  ],
  outputFields: [
    { key: 'labels', type: 'array', description: 'Predicted labels with confidence scores' },
  ],
}

export const translatorDescriptor: RunnerConfigDescriptor = {
  nodeType: 'translator',
  displayName: 'Translator',
  category: 'ai_primitive',
  needsAiProvider: true,
  fields: [
    {
      key: 'targetLanguage',
      label: 'Target Language',
      type: 'text',
      required: true,
      placeholder: 'e.g. tr, en, de',
      tooltip: {
        summary: 'The language the text should be translated into.',
        format: 'ISO 639-1 code (e.g. tr, en, de, fr, ja).',
        commonMistakes: 'Using full language names (e.g. "Turkish") instead of ISO codes.',
      },
    },
    {
      key: 'sourceLanguage',
      label: 'Source Language',
      type: 'text',
      hint: 'Auto-detected if omitted.',
      tooltip: {
        summary: 'The language of the input text. Auto-detected if left empty.',
        format: 'ISO 639-1 code. Leave empty for auto-detection.',
        executionImpact: 'Explicit source language avoids mis-detection for short or ambiguous text.',
      },
    },
    {
      key: 'preserveFormatting',
      label: 'Preserve Formatting',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether to maintain the original text structure (paragraphs, bullet points, markdown) in the translation.',
        executionImpact: 'When true, the AI preserves whitespace, lists, and markdown syntax. When false, output may be reformatted.',
      },
    },
    {
      key: 'glossary',
      label: 'Glossary',
      type: 'key_value',
      placeholder: 'Term',
      hint: 'Term → translation mappings for domain-specific vocabulary.',
      tooltip: {
        summary: 'Custom term-to-translation mappings that override the AI default translations for specific words.',
        format: 'Key-value pairs where keys are source terms and values are their required translations.',
        whenRequired: 'When you have domain-specific terminology (brand names, technical terms) that should not be freely translated.',
      },
    },
  ],
  outputFields: [
    { key: 'translated', type: 'string', description: 'Translated text' },
    { key: 'detectedLanguage', type: 'string', description: 'Detected source language' },
  ],
}

export const imageAnalyzeDescriptor: RunnerConfigDescriptor = {
  nodeType: 'image_analyze',
  displayName: 'Image Analyze',
  category: 'ai_primitive',
  needsAiProvider: true,
  fields: [
    {
      key: 'prompt',
      label: 'Analysis Prompt',
      type: 'textarea',
      placeholder: 'What to analyze in the image.',
      tooltip: {
        summary: 'Instructions telling the AI what to look for or describe in the image.',
        format: 'Free-form text. Be specific about what aspects to analyze (objects, text, colors, composition).',
        executionImpact: 'A focused prompt produces more relevant analysis. A vague prompt produces a generic description.',
      },
    },
    {
      key: 'outputFormat',
      label: 'Output Format',
      type: 'select',
      defaultValue: 'json',
      options: [
        { label: 'JSON', value: 'json' },
        { label: 'Text', value: 'text' },
      ],
      tooltip: {
        summary: 'Whether the analysis result is returned as structured JSON or plain text.',
        executionImpact: 'JSON is easier to parse in downstream nodes. Text is more natural for human-readable summaries.',
      },
    },
    {
      key: 'detailLevel',
      label: 'Detail Level',
      type: 'select',
      defaultValue: 'detailed',
      options: [
        { label: 'Brief', value: 'brief' },
        { label: 'Detailed', value: 'detailed' },
      ],
      tooltip: {
        summary: 'How thorough the image analysis should be.',
        executionImpact: 'Detailed produces richer output but costs more tokens. Brief is faster and cheaper.',
      },
    },
  ],
  outputFields: [
    { key: 'analysis', type: 'object', description: 'Image analysis result' },
  ],
}

export const audioTranscribeDescriptor: RunnerConfigDescriptor = {
  nodeType: 'audio_transcribe',
  displayName: 'Audio Transcribe',
  category: 'ai_primitive',
  needsAiProvider: true,
  fields: [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      required: true,
      options: [
        { label: 'OpenAI', value: 'openai' },
        { label: 'Google', value: 'google' },
      ],
      tooltip: {
        summary: 'The transcription service provider to use.',
        executionImpact: 'Different providers have different pricing, accuracy, and language support. OpenAI Whisper is generally strong for multilingual audio.',
      },
    },
    {
      key: 'language',
      label: 'Language',
      type: 'text',
      placeholder: 'ISO 639-1',
      tooltip: {
        summary: 'The expected language of the audio. Helps the transcription model produce more accurate results.',
        format: 'ISO 639-1 code (e.g. en, tr, de). Leave empty for auto-detection.',
      },
    },
    {
      key: 'timestamps',
      label: 'Include Timestamps',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether to include word- or segment-level timestamps in the transcription output.',
        executionImpact: 'When true, the segments output contains start/end times for each segment. Useful for subtitles or audio alignment.',
      },
    },
  ],
  outputFields: [
    { key: 'transcript', type: 'string', description: 'Transcribed text' },
    { key: 'segments', type: 'array', description: 'Timestamped segments' },
  ],
}

export const videoAnalyzeDescriptor: RunnerConfigDescriptor = {
  nodeType: 'video_analyze',
  displayName: 'Video Analyze',
  category: 'ai_primitive',
  needsAiProvider: true,
  fields: [
    {
      key: 'frameInterval',
      label: 'Frame Interval (seconds)',
      type: 'number',
      defaultValue: '5',
      min: 1,
      max: 60,
      hint: 'Seconds between key frames.',
      tooltip: {
        summary: 'How many seconds apart key frames are extracted from the video for analysis.',
        format: 'Integer between 1 and 60 seconds.',
        executionImpact: 'Smaller intervals capture more detail but produce more frames to analyze (higher cost). Larger intervals may miss key moments.',
      },
    },
    {
      key: 'maxFrames',
      label: 'Max Frames',
      type: 'number',
      defaultValue: '20',
      min: 1,
      max: 100,
      tooltip: {
        summary: 'Maximum number of frames to extract and analyze from the video.',
        format: 'Integer between 1 and 100.',
        executionImpact: 'Each frame is sent to the AI for analysis. More frames = proportionally higher cost and latency.',
      },
    },
    {
      key: 'prompt',
      label: 'Analysis Prompt',
      type: 'textarea',
      placeholder: 'What to analyze in the video.',
      tooltip: {
        summary: 'Instructions telling the AI what to look for across the video frames.',
        format: 'Free-form text. Applied to each extracted frame and the overall summary.',
      },
    },
  ],
  outputFields: [
    { key: 'frames', type: 'array', description: 'Analyzed key frames' },
    { key: 'summary', type: 'string', description: 'Overall video analysis summary' },
  ],
}
