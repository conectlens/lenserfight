/**
 * CQ — Communication node config descriptors.
 *
 * Covers: email_send, slack_notify, discord_notify.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const emailSendDescriptor: RunnerConfigDescriptor = {
  nodeType: 'email_send',
  displayName: 'Email Send',
  category: 'communication',
  fields: [
    {
      key: 'to',
      label: 'To (email)',
      type: 'text',
      required: true,
      placeholder: 'user@example.com',
    },
    {
      key: 'subject',
      label: 'Subject',
      type: 'text',
      required: true,
      placeholder: 'Workflow result: {{n1.title}}',
    },
    {
      key: 'bodyTemplate',
      label: 'Body Template (optional)',
      type: 'textarea',
      rows: 5,
      placeholder: 'Defaults to upstream output. Use {{var}} for interpolation.',
      hint: 'Rate limit: 50 emails/hour/workflow. Max 100KB body.',
    },
  ],
  outputFields: [
    { key: 'sent', type: 'boolean', description: 'Whether email was dispatched' },
  ],
}

export const slackNotifyDescriptor: RunnerConfigDescriptor = {
  nodeType: 'slack_notify',
  displayName: 'Slack Notify',
  category: 'communication',
  fields: [
    {
      key: 'webhookUrl',
      label: 'Webhook URL',
      type: 'text',
      required: true,
      placeholder: 'https://hooks.slack.com/services/...',
    },
    {
      key: 'messageTemplate',
      label: 'Message Template (optional)',
      type: 'textarea',
      rows: 4,
      placeholder: 'Defaults to upstream output. Use {{var}} for interpolation.',
    },
  ],
  outputFields: [
    { key: 'sent', type: 'boolean', description: 'Whether message was sent' },
  ],
}

export const discordNotifyDescriptor: RunnerConfigDescriptor = {
  nodeType: 'discord_notify',
  displayName: 'Discord Notify',
  category: 'communication',
  fields: [
    {
      key: 'webhookUrl',
      label: 'Webhook URL',
      type: 'text',
      required: true,
      placeholder: 'https://discord.com/api/webhooks/...',
    },
    {
      key: 'messageTemplate',
      label: 'Message Template (optional)',
      type: 'textarea',
      rows: 4,
      placeholder: 'Defaults to upstream output. Use {{var}} for interpolation.',
      hint: '2000 char limit. Truncates with ... if exceeded.',
    },
  ],
  outputFields: [
    { key: 'sent', type: 'boolean', description: 'Whether message was sent' },
  ],
}
