/**
 * CQ — Integration Extended node config descriptors.
 *
 * Covers: github_pr_review, github_issue_create, notion_write,
 *         calendar_create, linear_issue_create, jira_issue_create.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const githubPrReviewDescriptor: RunnerConfigDescriptor = {
  nodeType: 'github_pr_review',
  displayName: 'GitHub PR Review',
  category: 'integration',
  fields: [
    {
      key: 'repo',
      label: 'Repository',
      type: 'text',
      required: true,
      placeholder: 'owner/repo',
    },
    {
      key: 'prNumber',
      label: 'PR Number',
      type: 'text',
      required: true,
      mono: true,
    },
    {
      key: 'includeComments',
      label: 'Include Comments',
      type: 'boolean',
      defaultValue: 'true',
    },
    {
      key: 'fileFilter',
      label: 'File Filter',
      type: 'text',
      placeholder: '*.ts,*.tsx',
    },
  ],
  outputFields: [
    { key: 'pr', type: 'object', description: 'Pull request data' },
    { key: 'files', type: 'array', description: 'Changed files' },
    { key: 'comments', type: 'array', description: 'PR comments' },
  ],
}

export const githubIssueCreateDescriptor: RunnerConfigDescriptor = {
  nodeType: 'github_issue_create',
  displayName: 'GitHub Issue Create',
  category: 'integration',
  fields: [
    {
      key: 'repo',
      label: 'Repository',
      type: 'text',
      required: true,
      placeholder: 'owner/repo',
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
      rows: 6,
    },
    {
      key: 'labels',
      label: 'Labels',
      type: 'json',
      hint: 'Array of label names.',
    },
    {
      key: 'assignees',
      label: 'Assignees',
      type: 'json',
      hint: 'Array of GitHub usernames.',
    },
  ],
  outputFields: [
    { key: 'issueNumber', type: 'number', description: 'Created issue number' },
    { key: 'url', type: 'string', description: 'Issue URL' },
  ],
}

export const notionWriteDescriptor: RunnerConfigDescriptor = {
  nodeType: 'notion_write',
  displayName: 'Notion Write',
  category: 'integration',
  fields: [
    {
      key: 'databaseId',
      label: 'Database ID',
      type: 'text',
      required: true,
    },
    {
      key: 'properties',
      label: 'Properties',
      type: 'json',
      required: true,
      hint: 'Notion property object.',
    },
    {
      key: 'content',
      label: 'Page Content',
      type: 'textarea',
      rows: 4,
    },
  ],
  outputFields: [
    { key: 'pageId', type: 'string', description: 'Created page ID' },
    { key: 'url', type: 'string', description: 'Page URL' },
  ],
}

export const calendarCreateDescriptor: RunnerConfigDescriptor = {
  nodeType: 'calendar_create',
  displayName: 'Calendar Event Create',
  category: 'integration',
  fields: [
    {
      key: 'calendarId',
      label: 'Calendar ID',
      type: 'text',
      required: true,
      defaultValue: 'primary',
    },
    {
      key: 'summary',
      label: 'Summary',
      type: 'text',
      required: true,
    },
    {
      key: 'startTime',
      label: 'Start Time',
      type: 'datetime',
      required: true,
    },
    {
      key: 'endTime',
      label: 'End Time',
      type: 'datetime',
      required: true,
    },
    {
      key: 'timezone',
      label: 'Timezone',
      type: 'text',
      defaultValue: 'Europe/Istanbul',
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
    },
    {
      key: 'attendees',
      label: 'Attendees',
      type: 'json',
      hint: 'Array of email addresses.',
    },
  ],
  outputFields: [
    { key: 'eventId', type: 'string', description: 'Created event ID' },
    { key: 'htmlLink', type: 'string', description: 'Event link' },
  ],
}

export const linearIssueCreateDescriptor: RunnerConfigDescriptor = {
  nodeType: 'linear_issue_create',
  displayName: 'Linear Issue Create',
  category: 'integration',
  fields: [
    {
      key: 'teamId',
      label: 'Team ID',
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
      key: 'description',
      label: 'Description',
      type: 'textarea',
      rows: 4,
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'number',
      defaultValue: '2',
      min: 0,
      max: 4,
      hint: '0=none, 1=urgent, 4=low',
    },
    {
      key: 'labels',
      label: 'Labels',
      type: 'json',
      hint: 'Array of label IDs.',
    },
  ],
  outputFields: [
    { key: 'issueId', type: 'string', description: 'Created issue ID' },
    { key: 'url', type: 'string', description: 'Issue URL' },
  ],
}

export const jiraIssueCreateDescriptor: RunnerConfigDescriptor = {
  nodeType: 'jira_issue_create',
  displayName: 'Jira Issue Create',
  category: 'integration',
  fields: [
    {
      key: 'projectKey',
      label: 'Project Key',
      type: 'text',
      required: true,
    },
    {
      key: 'issueType',
      label: 'Issue Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Bug', value: 'Bug' },
        { label: 'Task', value: 'Task' },
        { label: 'Story', value: 'Story' },
        { label: 'Epic', value: 'Epic' },
      ],
    },
    {
      key: 'summary',
      label: 'Summary',
      type: 'text',
      required: true,
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      rows: 4,
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      defaultValue: 'Medium',
      options: [
        { label: 'Highest', value: 'Highest' },
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' },
        { label: 'Lowest', value: 'Lowest' },
      ],
    },
    {
      key: 'labels',
      label: 'Labels',
      type: 'json',
      hint: 'Array of label names.',
    },
  ],
  outputFields: [
    { key: 'issueKey', type: 'string', description: 'Created issue key (e.g. PROJ-123)' },
    { key: 'url', type: 'string', description: 'Issue URL' },
  ],
}
