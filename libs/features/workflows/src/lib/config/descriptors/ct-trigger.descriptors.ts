/**
 * CT — Trigger node config descriptors.
 *
 * Covers: manual_trigger, event_trigger, form_input_trigger.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const manualTriggerDescriptor: RunnerConfigDescriptor = {
  nodeType: 'manual_trigger',
  displayName: 'Manual Trigger',
  category: 'trigger',
  fields: [
    {
      key: 'inputSchema',
      label: 'Input Schema',
      type: 'json',
      hint: 'JSON schema describing the expected input payload.',
    },
  ],
  outputFields: [
    { key: 'payload', type: 'object', description: 'The manually provided input payload' },
  ],
}

export const eventTriggerDescriptor: RunnerConfigDescriptor = {
  nodeType: 'event_trigger',
  displayName: 'Event Trigger',
  category: 'trigger',
  fields: [
    {
      key: 'eventType',
      label: 'Event Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Battle Completed', value: 'battle.completed' },
        { label: 'Lens Published', value: 'lens.published' },
        { label: 'Workflow Failed', value: 'workflow.failed' },
        { label: 'Vote Cast', value: 'vote.cast' },
        { label: 'Leaderboard Updated', value: 'leaderboard.updated' },
      ],
    },
    {
      key: 'filterExpression',
      label: 'Filter Expression',
      type: 'text',
      placeholder: 'Optional filter to narrow matching events',
    },
  ],
  outputFields: [
    { key: 'event', type: 'object', description: 'The matched event payload' },
  ],
}

export const formInputTriggerDescriptor: RunnerConfigDescriptor = {
  nodeType: 'form_input_trigger',
  displayName: 'Form Input Trigger',
  category: 'trigger',
  fields: [
    {
      key: 'title',
      label: 'Form Title',
      type: 'text',
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
    },
    {
      key: 'fields',
      label: 'Form Fields',
      type: 'json',
      required: true,
      hint: 'Array of field definitions for the input form.',
    },
    {
      key: 'submitLabel',
      label: 'Submit Button Label',
      type: 'text',
      defaultValue: 'Submit',
    },
  ],
  outputFields: [
    { key: 'formData', type: 'object', description: 'Submitted form data' },
  ],
}
