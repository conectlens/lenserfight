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
      tooltip: {
        summary: 'The prompt template with variable placeholders that gets rendered before sending to the AI model.',
        format: 'Use {{variableName}} for placeholders. Reference upstream node outputs with {{nodeId}} or {{nodeId.fieldName}}.',
        commonMistakes: 'Forgetting double braces (using {var} instead of {{var}}). Referencing a node ID that doesn\'t exist in this workflow.',
        executionImpact: 'All placeholders are resolved at runtime. Missing variables render as empty strings unless strict mode is enabled upstream.',
      },
    },
    {
      key: 'variables',
      label: 'Variable Mappings',
      type: 'key_value',
      placeholder: 'Variable name',
      tooltip: {
        summary: 'Explicit mappings from template variable names to upstream node output paths.',
        format: 'JSON object: { "variableName": "nodeId.fieldPath" }. Each key maps to a {{variableName}} in the template.',
        whenRequired: 'When template variables do not match upstream node IDs and need explicit remapping.',
        commonMistakes: 'Mapping to a non-existent node ID or field path, which renders the variable as empty.',
      },
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
      tooltip: {
        summary: 'The specific fields to pull out of the parsed output. Only these fields appear in the extracted output.',
        format: 'Comma-separated field names (e.g. name, score, reasoning).',
        commonMistakes: 'Including spaces after commas is fine, but field names themselves must not contain spaces.',
      },
    },
    {
      key: 'jsonPath',
      label: 'JSON Path (optional)',
      type: 'text',
      placeholder: 'response.data',
      mono: true,
      tooltip: {
        summary: 'A dot-notation path to drill into the parsed JSON before extracting fields.',
        format: 'Dot-notation path (e.g. response.data, results[0]).',
        whenRequired: 'When the AI output wraps the useful data in a nested structure.',
      },
    },
    {
      key: 'strict',
      label: 'Strict mode (fail if fields missing)',
      type: 'boolean',
      defaultValue: 'false',
      tooltip: {
        summary: 'When enabled, the node fails if any of the specified fields are not found in the parsed output.',
        executionImpact: 'In strict mode, a missing field causes an error. In non-strict mode, missing fields are set to null in the output.',
      },
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
      tooltip: {
        summary: 'Dot-notation path to the text field in the upstream output to embed. Defaults to the entire upstream text.',
        format: 'Dot-notation path (e.g. data.content, summary). Leave empty for full upstream output.',
      },
    },
    {
      key: 'dimensions',
      label: 'Dimensions (optional)',
      type: 'number',
      placeholder: 'e.g. 1536',
      tooltip: {
        summary: 'The dimensionality of the output embedding vector. Uses model default if omitted.',
        format: 'Integer (e.g. 1536 for OpenAI text-embedding-3-small, 768 for smaller models).',
        commonMistakes: 'Setting dimensions that the selected model does not support, which causes an API error.',
        executionImpact: 'Higher dimensions capture more semantic detail but increase storage and computation cost for vector search.',
      },
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
      tooltip: {
        summary: 'The search query used to find relevant documents in the vector store.',
        format: 'Plain text string. Supports {{variable}} interpolation. Defaults to upstream text output if empty.',
      },
    },
    {
      key: 'topK',
      label: 'Top-K',
      type: 'number',
      defaultValue: '5',
      min: 1,
      max: 20,
      tooltip: {
        summary: 'How many documents to retrieve from the vector store.',
        format: 'Integer between 1 and 20.',
        executionImpact: 'Higher values return more context but increase token cost and latency. Lower values are faster but may miss relevant information.',
        commonMistakes: 'Setting too high (20) for simple queries wastes tokens. Setting too low (1) for complex topics misses context.',
      },
    },
    {
      key: 'minScore',
      label: 'Min Score',
      type: 'number',
      defaultValue: '0',
      min: 0,
      max: 1,
      step: 0.1,
      tooltip: {
        summary: 'Minimum similarity score threshold. Documents below this score are excluded from results.',
        format: 'Decimal between 0 and 1. 0 = no filtering, 0.8 = only highly relevant results.',
        executionImpact: 'Higher values return fewer but more relevant results. Too high may return zero results for ambiguous queries.',
      },
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
      tooltip: {
        summary: 'Instructions telling the AI judge how to evaluate and score the contender outputs.',
        format: 'Free-form text describing evaluation criteria, scoring guidelines, and penalty conditions.',
        commonMistakes: 'Writing vague rubrics (e.g. "be fair") that produce inconsistent scoring. Include specific criteria with weights.',
        executionImpact: 'The rubric is injected into the judge prompt. More detailed rubrics produce more consistent and explainable verdicts.',
      },
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
      tooltip: {
        summary: 'Whether the judge compares two entries head-to-head (pairwise) or scores each entry independently (absolute).',
        executionImpact: 'Pairwise is more reliable for ranking but only supports 2 contenders. Absolute supports any number but may have less consistent relative scoring.',
      },
    },
    {
      key: 'maxScore',
      label: 'Max Score',
      type: 'number',
      defaultValue: '10',
      min: 1,
      max: 100,
      tooltip: {
        summary: 'The upper bound of the scoring scale the judge uses.',
        format: 'Integer between 1 and 100. Common scales: 10 (default), 5, 100.',
        commonMistakes: 'Using very large scales (e.g. 100) without a detailed rubric, which makes scores cluster around the middle.',
      },
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
      tooltip: {
        summary: 'The key identifying the memory entry to read from the lenser memory store.',
        format: 'String key (e.g. session_context, user_preferences). Must match exactly the key used when writing.',
        executionImpact: 'Returns the stored value if found, or null with found=false if the key does not exist.',
      },
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
      tooltip: {
        summary: 'The key under which the value will be stored in the lenser memory store.',
        format: 'String key (e.g. session_context, last_result). Use consistent naming for read/write pairs.',
        commonMistakes: 'Using different keys for write and read, which makes the stored value unretrievable.',
      },
    },
    {
      key: 'value',
      label: 'Value (optional)',
      type: 'text',
      placeholder: 'Defaults to upstream output',
      tooltip: {
        summary: 'The value to store in memory. Defaults to the full upstream output text if left empty.',
        format: 'Any string. Supports {{variable}} interpolation.',
        executionImpact: 'The write is buffered during execution and committed when the node completes. Overwrites any existing value for this key.',
      },
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
      tooltip: {
        summary: 'The system-level instruction that sets the behavior and persona for the chain conversation.',
        format: 'Free-form text. This becomes the system message in the conversation history.',
        executionImpact: 'Included as the first message in every chain turn. Longer system prompts consume more tokens per turn.',
      },
    },
    {
      key: 'maxTurns',
      label: 'Max Turns',
      type: 'number',
      defaultValue: '20',
      min: 1,
      max: 50,
      tooltip: {
        summary: 'Maximum number of conversation turns (user+assistant pairs) to include in the chain context.',
        format: 'Integer between 1 and 50.',
        executionImpact: 'Higher values retain more conversation history but increase token usage per call. Older turns are dropped when the limit is reached.',
      },
    },
    {
      key: 'includeUpstream',
      label: 'Include upstream as assistant messages',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether outputs from upstream nodes are injected as assistant messages in the conversation history.',
        executionImpact: 'When true, upstream outputs provide context to the chain. When false, the chain starts fresh with only the system prompt.',
      },
    },
  ],
  outputFields: [
    { key: 'messages', type: 'array', description: 'Conversation history' },
    { key: 'text', type: 'string', description: 'Assembled prompt text' },
  ],
}
