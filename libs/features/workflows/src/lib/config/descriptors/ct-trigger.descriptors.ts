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
      label: 'Input Fields',
      type: 'schema_builder',
      hint: 'Define the input fields available to downstream nodes during test and production runs.',
      tooltip: {
        summary: 'Defines the payload shape available to all downstream nodes when this workflow is triggered manually.',
        whenRequired: 'Required when downstream nodes depend on dynamic input values (e.g., a topic, language, or file).',
        format: 'Add fields with name, type, and optionally default values. Names must be valid identifiers.',
        commonMistakes: 'Using spaces in field names, forgetting to mark required fields, not providing defaults for optional fields.',
        executionImpact: 'At runtime, users will be prompted to fill these fields before the workflow starts. Values flow as payload.fieldName to downstream nodes.',
      },
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
      tooltip: {
        summary: 'The platform event that starts this workflow.',
        whenRequired: 'Always required — determines when the workflow fires.',
        format: 'Select from available platform events.',
        executionImpact: 'The workflow runs automatically each time this event occurs. The full event payload is available to downstream nodes.',
      },
    },
    {
      key: 'filterExpression',
      label: 'Filter Expression',
      type: 'text',
      placeholder: 'e.g. event.metadata.category == "ai"',
      tooltip: {
        summary: 'Optional expression to narrow which events trigger this workflow.',
        format: 'JavaScript-like expression evaluated against the event object. Must return truthy to proceed.',
        commonMistakes: 'Using single = instead of == for comparison. Referencing fields that don\'t exist on the event.',
        executionImpact: 'If the filter returns falsy, the workflow is silently skipped for that event.',
      },
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
      tooltip: {
        summary: 'Title shown at the top of the input form presented to users.',
        executionImpact: 'Displayed to end-users when they trigger this workflow via its public form URL.',
      },
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      tooltip: {
        summary: 'Help text shown below the title, explaining what the form is for.',
      },
    },
    {
      key: 'fields',
      label: 'Form Fields',
      type: 'schema_builder',
      required: true,
      hint: 'Define the fields users see and fill when triggering this workflow.',
      tooltip: {
        summary: 'Defines the form fields presented to users. Each field becomes available as formData.fieldName to downstream nodes.',
        whenRequired: 'Always required — the form needs at least one field.',
        format: 'Add fields using the builder. Names must be valid identifiers (no spaces).',
        commonMistakes: 'Not marking essential fields as required, using duplicate field names.',
        executionImpact: 'Users fill this form to start the workflow. Submitted data flows as formData to the next node.',
      },
    },
    {
      key: 'submitLabel',
      label: 'Submit Button Label',
      type: 'text',
      defaultValue: 'Submit',
      tooltip: {
        summary: 'Text shown on the form submit button.',
      },
    },
  ],
  outputFields: [
    { key: 'formData', type: 'object', description: 'Submitted form data' },
  ],
}
