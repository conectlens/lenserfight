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
    },
    {
      key: 'chatId',
      label: 'Chat ID',
      type: 'text',
      required: true,
    },
    {
      key: 'messageTemplate',
      label: 'Message Template',
      type: 'textarea',
      rows: 4,
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
    },
    {
      key: 'disableNotification',
      label: 'Disable Notification Sound',
      type: 'boolean',
      defaultValue: 'false',
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
    },
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      required: true,
    },
    {
      key: 'body',
      label: 'Body',
      type: 'textarea',
      required: true,
      rows: 3,
    },
    {
      key: 'actionUrl',
      label: 'Action URL',
      type: 'text',
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
    },
    {
      key: 'ttlMs',
      label: 'TTL (ms)',
      type: 'number',
      defaultValue: '86400000',
      min: 0,
      max: 604800000,
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
    },
    {
      key: 'body',
      label: 'Message Body',
      type: 'textarea',
      required: true,
      rows: 3,
      hint: 'Max 160 chars per segment.',
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
    },
    {
      key: 'from',
      label: 'From Number',
      type: 'text',
      hint: 'Optional sender number.',
    },
  ],
  outputFields: [
    { key: 'sid', type: 'string', description: 'Message SID' },
    { key: 'status', type: 'string', description: 'Delivery status' },
  ],
}
