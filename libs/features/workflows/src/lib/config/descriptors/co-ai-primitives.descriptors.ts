/**
 * CO — AI Primitive node config descriptors.
 *
 * Covers: prompt_template, output_parser, embedding, rag_retrieval,
 *         judge_evaluator, memory_read, memory_write, chain.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const promptTemplateDescriptor: RunnerConfigDescriptor = {
  nodeType: 'prompt_template',
  displayName: 'Prompt Template',
  category: 'ai_primitive',
  fields: [
    {
      key: 'template',
      label: 'Template',
      type: 'textarea',
      rows: 8,
      mono: true,
      placeholder: 'Write about {{topic}} for {{audience}}.\n\nContext: {{n1}}',
      hint: 'Use {{variable}} syntax. Upstream outputs: {{nodeId}} or {{nodeId.field}}.',
    },
    {
      key: 'variables',
      label: 'Variable Mappings (JSON, optional)',
      type: 'json',
      rows: 3,
      placeholder: '{ "topic": "n1.title" }',
    },
  ],
  outputFields: [
    { key: 'text', type: 'string', description: 'Rendered prompt text' },
  ],
}

export const outputParserDescriptor: RunnerConfigDescriptor = {
  nodeType: 'output_parser',
  displayName: 'Output Parser',
  category: 'ai_primitive',
  fields: [
    {
      key: 'fields',
      label: 'Fields to Extract (comma-separated)',
      type: 'text',
      placeholder: 'name, score, reasoning',
    },
    {
      key: 'jsonPath',
      label: 'JSON Path (optional)',
      type: 'text',
      placeholder: 'response.data',
      mono: true,
    },
    {
      key: 'strict',
      label: 'Strict mode (fail if fields missing)',
      type: 'boolean',
      defaultValue: 'false',
    },
  ],
  outputFields: [
    { key: 'parsed', type: 'object', description: 'Parsed JSON object' },
    { key: 'fields', type: 'object', description: 'Extracted fields (if specified)' },
  ],
}

export const embeddingDescriptor: RunnerConfigDescriptor = {
  nodeType: 'embedding',
  displayName: 'Embedding',
  category: 'ai_primitive',
  needsAiProvider: true,
  fields: [
    {
      key: 'inputField',
      label: 'Input Field (dot-path, optional)',
      type: 'text',
      placeholder: 'Leave empty to use upstream text',
      mono: true,
    },
    {
      key: 'dimensions',
      label: 'Dimensions (optional)',
      type: 'number',
      placeholder: 'e.g. 1536',
    },
  ],
  outputFields: [
    { key: 'embedding', type: 'number[]', description: 'Vector embedding array' },
  ],
}

export const ragRetrievalDescriptor: RunnerConfigDescriptor = {
  nodeType: 'rag_retrieval',
  displayName: 'RAG Retrieval',
  category: 'ai_primitive',
  needsAiProvider: true,
  fields: [
    {
      key: 'query',
      label: 'Search Query (optional)',
      type: 'text',
      placeholder: 'Defaults to upstream text',
    },
    {
      key: 'topK',
      label: 'Top-K',
      type: 'number',
      defaultValue: '5',
      min: 1,
      max: 20,
    },
    {
      key: 'minScore',
      label: 'Min Score',
      type: 'number',
      defaultValue: '0',
      min: 0,
      max: 1,
      step: 0.1,
    },
  ],
  outputFields: [
    { key: 'results', type: 'array', description: 'Retrieved memory entries' },
    { key: 'count', type: 'number', description: 'Number of results' },
  ],
}

export const judgeEvaluatorDescriptor: RunnerConfigDescriptor = {
  nodeType: 'judge_evaluator',
  displayName: 'Judge Evaluator',
  category: 'ai_primitive',
  needsAiProvider: true,
  banner: {
    text: 'LenserFight Judge node. Wire upstream Lens outputs to compare, then connect this to a scoring Lens.',
    variant: 'info',
  },
  fields: [
    {
      key: 'rubric',
      label: 'Rubric',
      type: 'textarea',
      rows: 4,
      placeholder: 'Evaluate creativity, accuracy, and clarity. Penalize factual errors.',
    },
    {
      key: 'comparisonMode',
      label: 'Mode',
      type: 'select',
      defaultValue: 'pairwise',
      options: [
        { value: 'pairwise', label: 'Pairwise (2 entries)' },
        { value: 'absolute', label: 'Absolute (all entries)' },
      ],
    },
    {
      key: 'maxScore',
      label: 'Max Score',
      type: 'number',
      defaultValue: '10',
      min: 1,
      max: 100,
    },
  ],
  outputFields: [
    { key: 'verdict', type: 'object', description: 'Judge verdict with scores and reasoning' },
  ],
}

export const memoryReadDescriptor: RunnerConfigDescriptor = {
  nodeType: 'memory_read',
  displayName: 'Memory Read',
  category: 'ai_primitive',
  fields: [
    {
      key: 'key',
      label: 'Memory Key',
      type: 'text',
      placeholder: 'e.g. session_context',
      mono: true,
      hint: 'Reads stored value from lenser memory.',
    },
  ],
  outputFields: [
    { key: 'value', type: 'string', description: 'Stored memory value' },
    { key: 'found', type: 'boolean', description: 'Whether the key was found' },
  ],
}

export const memoryWriteDescriptor: RunnerConfigDescriptor = {
  nodeType: 'memory_write',
  displayName: 'Memory Write',
  category: 'ai_primitive',
  fields: [
    {
      key: 'key',
      label: 'Memory Key',
      type: 'text',
      placeholder: 'e.g. session_context',
      mono: true,
    },
    {
      key: 'value',
      label: 'Value (optional)',
      type: 'text',
      placeholder: 'Defaults to upstream output',
    },
  ],
  outputFields: [
    { key: 'written', type: 'boolean', description: 'Whether write was buffered' },
  ],
}

export const chainDescriptor: RunnerConfigDescriptor = {
  nodeType: 'chain',
  displayName: 'Chain',
  category: 'ai_primitive',
  needsAiProvider: true,
  fields: [
    {
      key: 'systemPrompt',
      label: 'System Prompt',
      type: 'textarea',
      rows: 4,
      placeholder: 'You are a helpful assistant...',
    },
    {
      key: 'maxTurns',
      label: 'Max Turns',
      type: 'number',
      defaultValue: '20',
      min: 1,
      max: 50,
    },
    {
      key: 'includeUpstream',
      label: 'Include upstream as assistant messages',
      type: 'boolean',
      defaultValue: 'true',
    },
  ],
  outputFields: [
    { key: 'messages', type: 'array', description: 'Conversation history' },
    { key: 'text', type: 'string', description: 'Assembled prompt text' },
  ],
}
