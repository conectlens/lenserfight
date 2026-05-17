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
      tooltip: {
        summary: 'The GitHub repository containing the pull request.',
        format: 'owner/repo format (e.g. lenserfight-org/lenserfight-web).',
      },
    },
    {
      key: 'prNumber',
      label: 'PR Number',
      type: 'text',
      required: true,
      mono: true,
      tooltip: {
        summary: 'The pull request number to review.',
        format: 'Integer PR number. Supports {{variable}} interpolation.',
      },
    },
    {
      key: 'includeComments',
      label: 'Include Comments',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether to fetch review comments alongside the PR data and changed files.',
        executionImpact: 'Adds an extra API call to GitHub. Disable to reduce latency when comments are not needed.',
      },
    },
    {
      key: 'fileFilter',
      label: 'File Filter',
      type: 'text',
      placeholder: '*.ts,*.tsx',
      tooltip: {
        summary: 'Glob pattern to filter which changed files are included in the output.',
        format: 'Comma-separated glob patterns (e.g. *.ts,*.tsx). Leave empty for all files.',
      },
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
      tooltip: {
        summary: 'The GitHub repository to create the issue in.',
        format: 'owner/repo format.',
      },
    },
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The issue title. Supports {{variable}} interpolation for dynamic titles.',
      },
    },
    {
      key: 'body',
      label: 'Body',
      type: 'textarea',
      rows: 6,
      tooltip: {
        summary: 'The issue body content in GitHub-flavored markdown.',
        format: 'Markdown text. Supports {{variable}} interpolation.',
      },
    },
    {
      key: 'labels',
      label: 'Labels',
      type: 'string_array',
      hint: 'Add label names one at a time.',
      tooltip: {
        summary: 'GitHub labels to apply to the created issue.',
        format: 'Array of existing label names. Labels that do not exist in the repo are silently ignored.',
      },
    },
    {
      key: 'assignees',
      label: 'Assignees',
      type: 'string_array',
      hint: 'Add GitHub usernames one at a time.',
      tooltip: {
        summary: 'GitHub usernames to assign to the issue.',
        format: 'Array of GitHub usernames (without @). Users must have access to the repository.',
      },
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
      tooltip: {
        summary: 'The Notion database to create a new page (row) in.',
        format: 'UUID format from the database URL.',
      },
    },
    {
      key: 'properties',
      label: 'Properties',
      type: 'key_value',
      required: true,
      placeholder: 'Property name',
      hint: 'Notion page properties. Map property names to values.',
      tooltip: {
        summary: 'The Notion database properties for the new page. Keys must match existing column names.',
        format: 'Key-value pairs matching database property names. Values support {{variable}} interpolation.',
        commonMistakes: 'Using property names that do not exist in the database schema, which are silently ignored.',
      },
    },
    {
      key: 'content',
      label: 'Page Content',
      type: 'textarea',
      rows: 4,
      tooltip: {
        summary: 'Optional page body content added below the properties.',
        format: 'Plain text or basic markdown. Converted to Notion blocks.',
      },
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
      key: 'connectorRef',
      label: 'Google Account',
      type: 'connector_ref',
      required: true,
      connectorProvider: 'google',
      connectorCapability: 'calendar',
      tooltip: {
        summary: 'The Google account connection to use for Calendar access.',
        whenRequired: 'Add a Google Calendar connection in Settings → Connected Accounts.',
      },
    },
    {
      key: 'calendarId',
      label: 'Calendar ID',
      type: 'text',
      required: true,
      defaultValue: 'primary',
      tooltip: {
        summary: 'The Google Calendar to create the event in.',
        format: '"primary" for the default calendar, or a specific calendar ID.',
      },
    },
    {
      key: 'summary',
      label: 'Summary',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The event title displayed on the calendar.',
        format: 'Plain text. Supports {{variable}} interpolation.',
      },
    },
    {
      key: 'startTime',
      label: 'Start Time',
      type: 'datetime',
      required: true,
      tooltip: {
        summary: 'When the calendar event starts.',
        format: 'ISO 8601 timestamp. Supports {{variable}} interpolation.',
      },
    },
    {
      key: 'endTime',
      label: 'End Time',
      type: 'datetime',
      required: true,
      tooltip: {
        summary: 'When the calendar event ends.',
        format: 'ISO 8601 timestamp. Must be after startTime.',
        commonMistakes: 'Setting endTime before startTime, which causes a Google API error.',
      },
    },
    {
      key: 'timezone',
      label: 'Timezone',
      type: 'text',
      defaultValue: 'Europe/Istanbul',
      tooltip: {
        summary: 'The timezone for the event start and end times.',
        format: 'IANA timezone name (e.g. Europe/Istanbul, America/New_York, UTC).',
      },
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      tooltip: {
        summary: 'The event description shown in the event detail view.',
        format: 'Plain text or HTML. Supports {{variable}} interpolation.',
      },
    },
    {
      key: 'attendees',
      label: 'Attendees',
      type: 'string_array',
      hint: 'Add attendee email addresses.',
      tooltip: {
        summary: 'Email addresses of people to invite to the event.',
        format: 'Array of valid email addresses.',
        executionImpact: 'Attendees receive a Google Calendar invitation email.',
      },
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
      tooltip: {
        summary: 'The Linear team to create the issue under.',
        format: 'Linear team UUID.',
      },
    },
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The issue title. Supports {{variable}} interpolation.',
      },
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      rows: 4,
      tooltip: {
        summary: 'The issue description in markdown format.',
        format: 'Markdown text. Supports {{variable}} interpolation.',
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'number',
      defaultValue: '2',
      min: 0,
      max: 4,
      hint: '0=none, 1=urgent, 4=low',
      tooltip: {
        summary: 'The issue priority level in Linear.',
        format: 'Integer: 0=none, 1=urgent, 2=high, 3=medium, 4=low.',
      },
    },
    {
      key: 'labels',
      label: 'Labels',
      type: 'string_array',
      hint: 'Add label IDs one at a time.',
      tooltip: {
        summary: 'Linear label UUIDs to apply to the issue.',
        format: 'Array of UUID strings. Labels must exist in the workspace.',
      },
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
      tooltip: {
        summary: 'The Jira project key to create the issue in.',
        format: 'Uppercase project key (e.g. PROJ, LF, CORE).',
        commonMistakes: 'Using the full project name instead of the key abbreviation.',
      },
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
      tooltip: {
        summary: 'The type of Jira issue to create.',
        commonMistakes: 'Selecting Epic without the required Epic Name field configured in the project.',
      },
    },
    {
      key: 'summary',
      label: 'Summary',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The issue title/summary line. Supports {{variable}} interpolation.',
      },
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      rows: 4,
      tooltip: {
        summary: 'The issue description in Jira wiki markup or ADF format.',
        format: 'Plain text or Jira markup. Supports {{variable}} interpolation.',
      },
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
      tooltip: {
        summary: 'The issue priority level in Jira.',
      },
    },
    {
      key: 'labels',
      label: 'Labels',
      type: 'string_array',
      hint: 'Add label names one at a time.',
      tooltip: {
        summary: 'Jira labels to apply to the issue.',
        format: 'Array of label name strings. Labels are created if they do not exist.',
      },
    },
  ],
  outputFields: [
    { key: 'issueKey', type: 'string', description: 'Created issue key (e.g. PROJ-123)' },
    { key: 'url', type: 'string', description: 'Issue URL' },
  ],
}
