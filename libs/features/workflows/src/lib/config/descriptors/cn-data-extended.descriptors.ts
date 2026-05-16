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
    },
    {
      key: 'fallback',
      label: 'Fallback Value',
      type: 'text',
      hint: 'Returned when path does not resolve.',
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
      type: 'json',
      required: true,
      hint: 'Object { oldKey: newKey }',
    },
    {
      key: 'keepUnmapped',
      label: 'Keep Unmapped Fields',
      type: 'boolean',
      defaultValue: 'true',
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
    },
    {
      key: 'limit',
      label: 'Max Results',
      type: 'number',
      min: 1,
      max: 10000,
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
    },
    {
      key: 'field',
      label: 'Field',
      type: 'text',
      required: true,
      mono: true,
    },
    {
      key: 'groupBy',
      label: 'Group By',
      type: 'text',
      hint: 'Optional field to group results.',
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
    },
    {
      key: 'secondaryField',
      label: 'Secondary Sort Field',
      type: 'text',
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
    },
    {
      key: 'keepFirst',
      label: 'Keep First Occurrence',
      type: 'boolean',
      defaultValue: 'true',
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
    },
    {
      key: 'chunkSize',
      label: 'Chunk Size',
      type: 'number',
      defaultValue: '512',
      min: 64,
      max: 8192,
    },
    {
      key: 'overlap',
      label: 'Overlap',
      type: 'number',
      defaultValue: '64',
      min: 0,
      max: 1024,
    },
    {
      key: 'separator',
      label: 'Custom Separator',
      type: 'text',
      hint: 'Optional custom separator character or string.',
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
    },
    {
      key: 'strict',
      label: 'Strict Mode',
      type: 'boolean',
      defaultValue: 'false',
      hint: 'Fail if a source field is missing.',
    },
    {
      key: 'includeUnmapped',
      label: 'Include Unmapped Fields',
      type: 'boolean',
      defaultValue: 'false',
    },
  ],
  outputFields: [
    { key: 'data', type: 'object', description: 'Mapped output object' },
  ],
}
