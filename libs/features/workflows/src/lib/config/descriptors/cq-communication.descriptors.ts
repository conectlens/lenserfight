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
      tooltip: {
        summary: 'The recipient email address.',
        format: 'Valid email address. Supports {{variable}} interpolation for dynamic recipients.',
        commonMistakes: 'Using a template variable that resolves to an invalid email, which causes the send to fail.',
      },
    },
    {
      key: 'subject',
      label: 'Subject',
      type: 'text',
      required: true,
      placeholder: 'Workflow result: {{n1.title}}',
      tooltip: {
        summary: 'The email subject line.',
        format: 'Plain text. Supports {{variable}} interpolation.',
      },
    },
    {
      key: 'bodyTemplate',
      label: 'Body Template (optional)',
      type: 'textarea',
      rows: 5,
      placeholder: 'Defaults to upstream output. Use {{var}} for interpolation.',
      hint: 'Rate limit: 50 emails/hour/workflow. Max 100KB body.',
      tooltip: {
        summary: 'The email body content. Supports static text, mapped upstream values, and template interpolation.',
        format: 'Plain text or HTML. Use {{nodeId.field}} to inject upstream output values.',
        commonMistakes: 'Exceeding the 100KB body limit. Sending to invalid email addresses (validation runs before send).',
        executionImpact: 'In dry-run mode, emails are NOT actually sent — the node returns a mock success. In production, rate-limited to 50/hour.',
      },
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
      tooltip: {
        summary: 'The Slack incoming webhook URL to post messages to.',
        format: 'Full URL from Slack webhook configuration (https://hooks.slack.com/services/...).',
        commonMistakes: 'Using a revoked or expired webhook URL. Storing the URL in plain text instead of using {{secrets.SLACK_WEBHOOK}}.',
      },
    },
    {
      key: 'messageTemplate',
      label: 'Message Template (optional)',
      type: 'textarea',
      rows: 4,
      placeholder: 'Defaults to upstream output. Use {{var}} for interpolation.',
      tooltip: {
        summary: 'The message content sent to Slack. Defaults to the upstream output if left empty.',
        format: 'Plain text or Slack mrkdwn format. Supports {{variable}} interpolation.',
      },
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
      tooltip: {
        summary: 'The Discord webhook URL to post messages to.',
        format: 'Full URL from Discord webhook settings (https://discord.com/api/webhooks/...).',
        commonMistakes: 'Using a Slack webhook URL instead of a Discord one. Storing the URL in plain text instead of using {{secrets.DISCORD_WEBHOOK}}.',
      },
    },
    {
      key: 'messageTemplate',
      label: 'Message Template (optional)',
      type: 'textarea',
      rows: 4,
      placeholder: 'Defaults to upstream output. Use {{var}} for interpolation.',
      hint: '2000 char limit. Truncates with ... if exceeded.',
      tooltip: {
        summary: 'The message content sent to Discord. Defaults to the upstream output if left empty.',
        format: 'Plain text or Discord markdown. Max 2000 characters; longer messages are truncated.',
        executionImpact: 'Messages exceeding 2000 characters are automatically truncated with "..." appended.',
      },
    },
  ],
  outputFields: [
    { key: 'sent', type: 'boolean', description: 'Whether message was sent' },
  ],
}
