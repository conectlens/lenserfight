/**
 * CQ — Communication Extended node config descriptors.
 *
 * Covers: telegram_notify, push_notification, sms_send.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const telegramNotifyDescriptor: RunnerConfigDescriptor = {
  nodeType: 'telegram_notify',
  displayName: 'Telegram Notify',
  category: 'communication',
  fields: [
    {
      key: 'botToken',
      label: 'Bot Token',
      type: 'text',
      required: true,
      hint: 'Use {{secrets.TELEGRAM_BOT_TOKEN}}',
      tooltip: {
        summary: 'The Telegram bot API token used to send messages.',
        format: 'Token string from BotFather. Always use {{secrets.TELEGRAM_BOT_TOKEN}} instead of a raw token.',
        commonMistakes: 'Pasting the raw token directly, which exposes it in workflow exports and logs.',
      },
    },
    {
      key: 'chatId',
      label: 'Chat ID',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The Telegram chat, group, or channel ID to send the message to.',
        format: 'Numeric chat ID (e.g. -1001234567890 for groups) or @channel_username.',
        commonMistakes: 'Using a username without the @ prefix. Using a private chat ID the bot does not have access to.',
      },
    },
    {
      key: 'messageTemplate',
      label: 'Message Template',
      type: 'textarea',
      rows: 4,
      tooltip: {
        summary: 'The message content sent to Telegram. Defaults to upstream output if left empty.',
        format: 'Text with {{variable}} interpolation. Formatting depends on the Parse Mode setting.',
      },
    },
    {
      key: 'parseMode',
      label: 'Parse Mode',
      type: 'select',
      defaultValue: 'Markdown',
      options: [
        { label: 'Markdown', value: 'Markdown' },
        { label: 'HTML', value: 'HTML' },
        { label: 'Plain', value: 'plain' },
      ],
      tooltip: {
        summary: 'How Telegram formats the message text.',
        commonMistakes: 'Using Markdown mode with unescaped special characters (_, *, `) which breaks formatting.',
      },
    },
    {
      key: 'disableNotification',
      label: 'Disable Notification Sound',
      type: 'boolean',
      defaultValue: 'false',
      tooltip: {
        summary: 'When enabled, the message is delivered silently without a notification sound on the recipient device.',
      },
    },
  ],
  outputFields: [
    { key: 'messageId', type: 'string', description: 'Sent message ID' },
    { key: 'ok', type: 'boolean', description: 'Whether the send succeeded' },
  ],
}

export const pushNotificationDescriptor: RunnerConfigDescriptor = {
  nodeType: 'push_notification',
  displayName: 'Push Notification',
  category: 'communication',
  fields: [
    {
      key: 'recipientLenserId',
      label: 'Recipient Lenser ID',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The UUID of the lenser who should receive the push notification.',
        format: 'UUID lenser ID. Supports {{variable}} interpolation.',
        executionImpact: 'If the lenser has no registered push tokens, the notification is silently dropped.',
      },
    },
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The notification title shown in the push banner.',
        format: 'Short text. Supports {{variable}} interpolation.',
      },
    },
    {
      key: 'body',
      label: 'Body',
      type: 'textarea',
      required: true,
      rows: 3,
      tooltip: {
        summary: 'The notification body text displayed below the title.',
        format: 'Plain text. Supports {{variable}} interpolation. Keep concise for mobile readability.',
      },
    },
    {
      key: 'actionUrl',
      label: 'Action URL',
      type: 'text',
      tooltip: {
        summary: 'A URL the user is taken to when they tap the notification.',
        format: 'Relative or absolute URL (e.g. /battle/abc123, https://lenserfight.com/...).',
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Normal', value: 'normal' },
        { label: 'High', value: 'high' },
      ],
      tooltip: {
        summary: 'The delivery priority of the push notification.',
        executionImpact: 'High priority notifications wake the device immediately. Low priority may be batched by the OS.',
      },
    },
    {
      key: 'ttlMs',
      label: 'TTL (ms)',
      type: 'number',
      defaultValue: '86400000',
      min: 0,
      max: 604800000,
      tooltip: {
        summary: 'How long the push service retries delivery if the device is offline.',
        format: 'Integer in milliseconds. 86400000 = 24 hours. 0 = deliver only if online now.',
        executionImpact: 'After TTL expires, undelivered notifications are dropped.',
      },
    },
  ],
  outputFields: [
    { key: 'delivered', type: 'boolean', description: 'Whether notification was delivered' },
  ],
}

export const smsSendDescriptor: RunnerConfigDescriptor = {
  nodeType: 'sms_send',
  displayName: 'SMS Send',
  category: 'communication',
  fields: [
    {
      key: 'to',
      label: 'Recipient Number',
      type: 'text',
      required: true,
      placeholder: '+905551234567',
      tooltip: {
        summary: 'The recipient phone number in E.164 format.',
        format: 'E.164 format with country code (e.g. +905551234567, +14155552671).',
        commonMistakes: 'Omitting the + prefix or country code. Using local number formats.',
      },
    },
    {
      key: 'body',
      label: 'Message Body',
      type: 'textarea',
      required: true,
      rows: 3,
      hint: 'Max 160 chars per segment.',
      tooltip: {
        summary: 'The SMS message content.',
        format: 'Plain text. Supports {{variable}} interpolation. Each segment is 160 characters.',
        executionImpact: 'Messages over 160 characters are split into multiple segments, each billed separately.',
      },
    },
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      defaultValue: 'twilio',
      options: [
        { label: 'Twilio', value: 'twilio' },
        { label: 'Vonage', value: 'vonage' },
      ],
      tooltip: {
        summary: 'The SMS provider used to send the message.',
        executionImpact: 'Provider credentials must be configured in the workflow secret store. Different providers have different pricing and coverage.',
      },
    },
    {
      key: 'from',
      label: 'From Number',
      type: 'text',
      hint: 'Optional sender number.',
      tooltip: {
        summary: 'The sender phone number or alphanumeric sender ID.',
        format: 'E.164 phone number or alphanumeric string (max 11 chars). Uses provider default if omitted.',
        whenRequired: 'Some countries require a registered sender number.',
      },
    },
  ],
  outputFields: [
    { key: 'sid', type: 'string', description: 'Message SID' },
    { key: 'status', type: 'string', description: 'Delivery status' },
  ],
}
