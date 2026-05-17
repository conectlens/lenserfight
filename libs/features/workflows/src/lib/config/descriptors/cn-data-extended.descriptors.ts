/**
 * CN — Data Extended node config descriptors.
 *
 * Covers: extract_field, rename_field, filter_items, aggregate, sort,
 *         deduplicate, text_splitter, data_mapper.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const extractFieldDescriptor: RunnerConfigDescriptor = {
  nodeType: 'extract_field',
  displayName: 'Extract Field',
  category: 'data',
  fields: [
    {
      key: 'path',
      label: 'Field Path',
      type: 'text',
      required: true,
      mono: true,
      placeholder: 'results[0].score',
      tooltip: {
        summary: 'Dot-notation path to the value to extract from the upstream output.',
        format: 'Dot-notation with bracket indexing (e.g. results[0].score, user.name).',
        commonMistakes: 'Referencing a non-existent path returns undefined, which falls through to the fallback value.',
      },
    },
    {
      key: 'fallback',
      label: 'Fallback Value',
      type: 'text',
      hint: 'Returned when path does not resolve.',
      tooltip: {
        summary: 'The value returned when the field path does not resolve to anything in the upstream output.',
        format: 'Any string. Passed as-is to downstream nodes.',
        executionImpact: 'Without a fallback, a missing path outputs null, which may cause errors in downstream nodes that expect a value.',
      },
    },
  ],
  outputFields: [
    { key: 'value', type: 'unknown', description: 'Extracted value' },
  ],
}

export const renameFieldDescriptor: RunnerConfigDescriptor = {
  nodeType: 'rename_field',
  displayName: 'Rename Field',
  category: 'data',
  fields: [
    {
      key: 'mappings',
      label: 'Rename Mappings',
      type: 'key_value',
      required: true,
      placeholder: 'Old name',
      hint: 'Map old field names to new field names.',
      tooltip: {
        summary: 'A JSON object mapping old field names to new field names.',
        format: '{ "oldKey": "newKey", "score": "rating" }. Keys are existing field names, values are new names.',
        commonMistakes: 'Mapping multiple old keys to the same new key, which causes data loss (last one wins).',
      },
    },
    {
      key: 'keepUnmapped',
      label: 'Keep Unmapped Fields',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether fields not listed in the mappings are preserved in the output.',
        executionImpact: 'When false, only renamed fields appear in the output. Useful for stripping unwanted data.',
      },
    },
  ],
  outputFields: [
    { key: 'data', type: 'object', description: 'Object with renamed fields' },
  ],
}

export const filterItemsDescriptor: RunnerConfigDescriptor = {
  nodeType: 'filter_items',
  displayName: 'Filter Items',
  category: 'data',
  fields: [
    {
      key: 'condition',
      label: 'Filter Condition',
      type: 'code',
      required: true,
      rows: 3,
      hint: 'JS expression, item variable available.',
      tooltip: {
        summary: 'A JavaScript expression evaluated for each item. Items where it returns true are kept.',
        format: 'JS expression using the `item` variable (e.g. item.score > 5, item.status === "active").',
        commonMistakes: 'Using = instead of === for comparison. Forgetting that item fields may be undefined.',
      },
    },
    {
      key: 'limit',
      label: 'Max Results',
      type: 'number',
      min: 1,
      max: 10000,
      tooltip: {
        summary: 'Caps the number of items returned after filtering.',
        format: 'Integer between 1 and 10000. Leave empty for no limit.',
        executionImpact: 'Applied after the condition filter. Items beyond this limit are dropped from the output.',
      },
    },
  ],
  outputFields: [
    { key: 'items', type: 'array', description: 'Filtered items' },
    { key: 'count', type: 'number', description: 'Number of items after filter' },
  ],
}

export const aggregateDescriptor: RunnerConfigDescriptor = {
  nodeType: 'aggregate',
  displayName: 'Aggregate',
  category: 'data',
  fields: [
    {
      key: 'operation',
      label: 'Operation',
      type: 'select',
      required: true,
      options: [
        { label: 'Sum', value: 'sum' },
        { label: 'Count', value: 'count' },
        { label: 'Average', value: 'avg' },
        { label: 'Min', value: 'min' },
        { label: 'Max', value: 'max' },
        { label: 'Concat', value: 'concat' },
      ],
      tooltip: {
        summary: 'The aggregation function to apply across all items in the input array.',
        commonMistakes: 'Using Sum or Average on non-numeric fields produces NaN. Count does not require a numeric field.',
      },
    },
    {
      key: 'field',
      label: 'Field',
      type: 'text',
      required: true,
      mono: true,
      tooltip: {
        summary: 'The field name on each item to aggregate (e.g. the numeric field to sum or average).',
        format: 'Field name present on each item in the input array (e.g. score, price).',
        commonMistakes: 'Pointing to a nested field without dot-notation — use top-level field names only.',
      },
    },
    {
      key: 'groupBy',
      label: 'Group By',
      type: 'text',
      hint: 'Optional field to group results.',
      tooltip: {
        summary: 'Groups items by this field value before applying the aggregation, producing one result per group.',
        format: 'Field name (e.g. category, status). Leave empty for a single aggregate across all items.',
        executionImpact: 'When set, the output is an array of { group, result } objects instead of a single value.',
      },
    },
  ],
  outputFields: [
    { key: 'result', type: 'unknown', description: 'Aggregation result' },
  ],
}

export const sortDescriptor: RunnerConfigDescriptor = {
  nodeType: 'sort',
  displayName: 'Sort',
  category: 'data',
  fields: [
    {
      key: 'field',
      label: 'Sort Field',
      type: 'text',
      required: true,
      mono: true,
      tooltip: {
        summary: 'The field name on each item used as the primary sort key.',
        format: 'Top-level field name (e.g. score, createdAt, name).',
        commonMistakes: 'Sorting on a field with mixed types (strings and numbers) produces unpredictable order.',
      },
    },
    {
      key: 'direction',
      label: 'Direction',
      type: 'select',
      defaultValue: 'desc',
      options: [
        { label: 'Ascending', value: 'asc' },
        { label: 'Descending', value: 'desc' },
      ],
      tooltip: {
        summary: 'Whether to sort items in ascending (A-Z, 0-9) or descending (Z-A, 9-0) order.',
      },
    },
    {
      key: 'secondaryField',
      label: 'Secondary Sort Field',
      type: 'text',
      tooltip: {
        summary: 'A tiebreaker field used when two items have the same primary sort value.',
        format: 'Top-level field name. Uses the same direction as the primary sort.',
      },
    },
  ],
  outputFields: [
    { key: 'items', type: 'array', description: 'Sorted items' },
  ],
}

export const deduplicateDescriptor: RunnerConfigDescriptor = {
  nodeType: 'deduplicate',
  displayName: 'Deduplicate',
  category: 'data',
  fields: [
    {
      key: 'key',
      label: 'Deduplication Key',
      type: 'text',
      required: true,
      mono: true,
      tooltip: {
        summary: 'The field used to identify duplicate items. Items with the same value for this key are considered duplicates.',
        format: 'Top-level field name (e.g. id, email, hash).',
        commonMistakes: 'Using a field with null/undefined values — all nulls are treated as the same key and deduplicated down to one.',
      },
    },
    {
      key: 'keepFirst',
      label: 'Keep First Occurrence',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether to keep the first or last occurrence when duplicates are found.',
        executionImpact: 'When true, the first item encountered is kept. When false, the last item wins. Depends on input ordering.',
      },
    },
  ],
  outputFields: [
    { key: 'items', type: 'array', description: 'Deduplicated items' },
    { key: 'removedCount', type: 'number', description: 'Number of duplicates removed' },
  ],
}

export const textSplitterDescriptor: RunnerConfigDescriptor = {
  nodeType: 'text_splitter',
  displayName: 'Text Splitter',
  category: 'data',
  fields: [
    {
      key: 'strategy',
      label: 'Split Strategy',
      type: 'select',
      required: true,
      options: [
        { label: 'Token', value: 'token' },
        { label: 'Character', value: 'character' },
        { label: 'Sentence', value: 'sentence' },
        { label: 'Paragraph', value: 'paragraph' },
      ],
      tooltip: {
        summary: 'How the text is divided into chunks. Token uses the model tokenizer, Character counts raw characters, Sentence/Paragraph split on natural boundaries.',
        commonMistakes: 'Using Token strategy without considering that token counts vary by model. Character is more predictable for fixed-size limits.',
        executionImpact: 'Token strategy adds a tokenization step. Sentence/Paragraph may produce unevenly-sized chunks.',
      },
    },
    {
      key: 'chunkSize',
      label: 'Chunk Size',
      type: 'number',
      defaultValue: '512',
      min: 64,
      max: 8192,
      tooltip: {
        summary: 'Maximum size of each chunk in the units defined by the split strategy (tokens or characters).',
        format: 'Integer between 64 and 8192.',
        executionImpact: 'Smaller chunks produce more output items but better granularity for RAG. Larger chunks retain more context per chunk.',
      },
    },
    {
      key: 'overlap',
      label: 'Overlap',
      type: 'number',
      defaultValue: '64',
      min: 0,
      max: 1024,
      tooltip: {
        summary: 'Number of tokens or characters that overlap between consecutive chunks to preserve context at boundaries.',
        format: 'Integer between 0 and 1024. Must be less than chunkSize.',
        commonMistakes: 'Setting overlap >= chunkSize creates infinite chunks. Setting to 0 may lose context at chunk boundaries.',
      },
    },
    {
      key: 'separator',
      label: 'Custom Separator',
      type: 'text',
      hint: 'Optional custom separator character or string.',
      tooltip: {
        summary: 'Overrides the default splitting boundary with a custom delimiter string.',
        whenRequired: 'When your text uses non-standard delimiters (e.g. "---" section breaks, "|" pipe separators).',
        format: 'Any string. Use \\n for newline, \\t for tab.',
      },
    },
  ],
  outputFields: [
    { key: 'chunks', type: 'array', description: 'Array of text chunks' },
    { key: 'chunkCount', type: 'number', description: 'Total number of chunks' },
  ],
}

export const dataMapperDescriptor: RunnerConfigDescriptor = {
  nodeType: 'data_mapper',
  displayName: 'Data Mapper',
  category: 'data',
  fields: [
    {
      key: 'mappings',
      label: 'Field Mappings',
      type: 'json',
      required: true,
      hint: 'Array of { source, target, transform }',
      tooltip: {
        summary: 'Defines how source fields are mapped to target fields, with optional inline transforms.',
        format: 'JSON array: [{ "source": "data.name", "target": "userName", "transform": "toUpperCase" }]. Transform is optional.',
        commonMistakes: 'Providing an object instead of an array. Omitting the target field name.',
      },
    },
    {
      key: 'strict',
      label: 'Strict Mode',
      type: 'boolean',
      defaultValue: 'false',
      hint: 'Fail if a source field is missing.',
      tooltip: {
        summary: 'When enabled, the node fails if any source field in the mappings does not exist in the input.',
        executionImpact: 'In strict mode, a missing source field throws an error. In non-strict mode, missing fields map to null.',
      },
    },
    {
      key: 'includeUnmapped',
      label: 'Include Unmapped Fields',
      type: 'boolean',
      defaultValue: 'false',
      tooltip: {
        summary: 'Whether input fields not covered by any mapping are passed through to the output unchanged.',
        executionImpact: 'When false, only explicitly mapped fields appear in the output. When true, all original fields are preserved alongside mapped ones.',
      },
    },
  ],
  outputFields: [
    { key: 'data', type: 'object', description: 'Mapped output object' },
  ],
}
