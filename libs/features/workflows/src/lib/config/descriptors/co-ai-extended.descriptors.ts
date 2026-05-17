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
    },
    {
      key: 'versionId',
      label: 'Version',
      type: 'text',
      placeholder: 'Latest published (default)',
      hint: 'Pin to a specific lens version ID. Leave empty for latest published.',
    },
    {
      key: 'temperature',
      label: 'Temperature',
      type: 'number',
      min: 0,
      max: 2,
      step: 0.1,
      hint: 'Controls randomness. Lower = more deterministic.',
    },
    {
      key: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
      min: 1,
      max: 16384,
      hint: 'Maximum tokens to generate.',
    },
    {
      key: 'connectorSlug',
      label: 'Connector',
      type: 'text',
      hint: 'Optional connector slug for credential-backed parameters (e.g. API key injection).',
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
    },
    {
      key: 'maxSteps',
      label: 'Max Steps',
      type: 'number',
      defaultValue: '10',
      min: 1,
      max: 50,
    },
    {
      key: 'tools',
      label: 'Available Tools',
      type: 'json',
      hint: 'Array of tool names the agent can use.',
    },
    {
      key: 'memoryKey',
      label: 'Memory Key',
      type: 'text',
      hint: 'Optional key for persistent agent memory.',
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
    },
    {
      key: 'topK',
      label: 'Top K Results',
      type: 'number',
      defaultValue: '5',
      min: 1,
      max: 100,
    },
    {
      key: 'minScore',
      label: 'Minimum Score',
      type: 'number',
      defaultValue: '0.75',
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: 'filter',
      label: 'Metadata Filter',
      type: 'json',
      hint: 'Optional filter object for metadata.',
    },
    {
      key: 'includeMetadata',
      label: 'Include Metadata',
      type: 'boolean',
      defaultValue: 'true',
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
    },
    {
      key: 'maxLength',
      label: 'Max Length',
      type: 'number',
      defaultValue: '500',
      min: 50,
      max: 5000,
    },
    {
      key: 'language',
      label: 'Language',
      type: 'text',
      defaultValue: 'en',
    },
    {
      key: 'focusAreas',
      label: 'Focus Areas',
      type: 'text',
      hint: 'Comma-separated areas to focus the summary on.',
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
      type: 'json',
      required: true,
      hint: 'Array of category labels.',
    },
    {
      key: 'examples',
      label: 'Few-Shot Examples',
      type: 'json',
      hint: 'Optional array of { text, label } examples.',
    },
    {
      key: 'multiLabel',
      label: 'Multi-Label',
      type: 'boolean',
      defaultValue: 'false',
    },
    {
      key: 'threshold',
      label: 'Confidence Threshold',
      type: 'number',
      defaultValue: '0.6',
      min: 0,
      max: 1,
      step: 0.05,
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
    },
    {
      key: 'sourceLanguage',
      label: 'Source Language',
      type: 'text',
      hint: 'Auto-detected if omitted.',
    },
    {
      key: 'preserveFormatting',
      label: 'Preserve Formatting',
      type: 'boolean',
      defaultValue: 'true',
    },
    {
      key: 'glossary',
      label: 'Glossary',
      type: 'json',
      hint: 'Optional { term: translation } mapping.',
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
    },
    {
      key: 'language',
      label: 'Language',
      type: 'text',
      placeholder: 'ISO 639-1',
    },
    {
      key: 'timestamps',
      label: 'Include Timestamps',
      type: 'boolean',
      defaultValue: 'true',
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
    },
    {
      key: 'maxFrames',
      label: 'Max Frames',
      type: 'number',
      defaultValue: '20',
      min: 1,
      max: 100,
    },
    {
      key: 'prompt',
      label: 'Analysis Prompt',
      type: 'textarea',
      placeholder: 'What to analyze in the video.',
    },
  ],
  outputFields: [
    { key: 'frames', type: 'array', description: 'Analyzed key frames' },
    { key: 'summary', type: 'string', description: 'Overall video analysis summary' },
  ],
}
